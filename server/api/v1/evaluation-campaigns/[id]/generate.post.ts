import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import { logAudit } from '~~/server/utils/audit'
import { Employee } from '~~/server/models/Employee'
import { Position } from '~~/server/models/Position'
import { EvaluationTemplate } from '~~/server/models/EvaluationTemplate'
import { Evaluation } from '~~/server/models/Evaluation'
import { EvaluationCampaign } from '~~/server/models/EvaluationCampaign'

/**
 * Genera las evaluaciones en lote de una campaña: empleados activos del
 * alcance, plantilla activa por cargo y evaluador según la regla.
 * Es idempotente: no duplica evaluaciones ya existentes de la campaña.
 */
export default defineEventHandler(async (event) => {
  const { userId } = await authorize(event, [ROLES.ADMIN, ROLES.HR])
  const tenantId = await getTenantId(event)
  const id = String(getRouterParam(event, 'id') ?? '')
  const session = await getUserSession(event)
  const userName = (session.user as { name?: string } | undefined)?.name ?? ''

  const campaign = await EvaluationCampaign.findOne({ _id: id, tenantId })
  if (!campaign) {
    throw createError({ statusCode: 404, message: 'Campaña no encontrada' })
  }
  if (campaign.status === 'closed') {
    throw createError({
      statusCode: 400,
      message: 'La campaña está cerrada y no puede generar evaluaciones.',
    })
  }

  const employeeFilter: Record<string, unknown> = { tenantId, active: true }
  if (campaign.scope === 'areas' && (campaign.areaIds ?? []).length) {
    employeeFilter.department = { $in: campaign.areaIds }
  }
  const employees = await Employee.find(employeeFilter)
    .select('position manager')
    .lean()

  const positions = await Position.find({ tenantId }).lean()
  const positionByTitle = new Map(
    positions.map((position) => [
      String(position.title ?? '').toLowerCase(),
      position,
    ]),
  )
  const templates = await EvaluationTemplate.find({
    tenantId,
    active: true,
  }).lean()
  const templateByPosition = new Map(
    templates.map((template) => [String(template.positionId), template]),
  )

  const existing = await Evaluation.find({
    tenantId,
    periodLabel: campaign.name,
    employee: { $in: employees.map((employee) => employee._id) },
  })
    .select('employee')
    .lean()
  const existingSet = new Set(existing.map((item) => String(item.employee)))

  const docs: Array<Record<string, unknown>> = []
  let skippedNoTemplate = 0
  let skippedExisting = 0
  for (const employee of employees) {
    if (existingSet.has(String(employee._id))) {
      skippedExisting++
      continue
    }
    const position = positionByTitle.get(
      String(employee.position ?? '').toLowerCase(),
    )
    const template = position
      ? templateByPosition.get(String(position._id))
      : null
    if (!template) {
      skippedNoTemplate++
      continue
    }
    const evaluator =
      campaign.evaluatorRule === 'manager' && employee.manager
        ? employee.manager
        : userId
    docs.push({
      tenantId,
      employee: employee._id,
      evaluator,
      periodLabel: campaign.name,
      templateId: template._id,
      positionId: position._id,
      status: 'draft',
      sections: (template.sections ?? []).map((section) => ({
        sectionId: section.id,
        sectionTitle: section.title,
        sectionWeight: section.weight,
        items: (section.items ?? []).map((item) => ({
          itemId: item.id,
          description: item.description,
          score: null,
        })),
      })),
      overallScore: 0,
    })
  }

  let created = 0
  if (docs.length) {
    const result = await Evaluation.insertMany(docs)
    created = result.length
  }
  campaign.generatedCount = (campaign.generatedCount ?? 0) + created
  if (campaign.status === 'draft' && created > 0) {
    campaign.status = 'active'
  }
  await campaign.save()

  await logAudit({
    module: 'evaluation-campaign',
    action: 'generate',
    entityId: String(campaign._id),
    userId,
    userName,
    description: `Campaña "${campaign.name}": ${created} evaluaciones generadas`,
    changes: {
      scope: campaign.scope,
      areaIds: campaign.areaIds,
      evaluatorRule: campaign.evaluatorRule,
      created,
      skippedNoTemplate,
      skippedExisting,
    },
  })

  return { created, skippedNoTemplate, skippedExisting }
})
