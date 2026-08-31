import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import { logAudit } from '~~/server/utils/audit'
import { Employee } from '~~/server/models/Employee'
import { Position } from '~~/server/models/Position'
import { EvaluationTemplate } from '~~/server/models/EvaluationTemplate'
import { Evaluation } from '~~/server/models/Evaluation'
import { EvaluationCampaign } from '~~/server/models/EvaluationCampaign'
import { Alert } from '~~/server/models/Alert'
import { publishAlert } from '~~/server/utils/alert-stream'

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
    .select('firstName lastName position manager user')
    .lean()
  const employeeById = new Map(
    employees.map((employee) => [String(employee._id), employee]),
  )

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

  // Jefes directos se guardan como Empleado; el aviso debe ir al Usuario vinculado.
  const employeeUserById = new Map<string, string>()
  for (const employee of employees) {
    if (employee.user) {
      employeeUserById.set(String(employee._id), String(employee.user))
    }
  }

  // Agrupar asignaciones por usuario evaluador y por autoevaluación.
  const evaluatorEmployeeIds = new Map<string, Set<string>>()
  const selfEvaluations = new Map<
    string,
    { userId: string; employeeId: string }
  >()
  let skippedNoEvaluatorUser = 0
  for (const doc of docs) {
    const employee = employeeById.get(String(doc.employee))
    if (doc.evaluator) {
      const evaluatorUserId =
        campaign.evaluatorRule === 'manager'
          ? employeeUserById.get(String(doc.evaluator))
          : String(doc.evaluator)
      if (evaluatorUserId) {
        let ids = evaluatorEmployeeIds.get(evaluatorUserId)
        if (!ids) {
          ids = new Set()
          evaluatorEmployeeIds.set(evaluatorUserId, ids)
        }
        ids.add(String(doc.evaluator))
      } else {
        skippedNoEvaluatorUser++
      }
    }
    if (campaign.allowSelfEvaluation && employee?.user) {
      const userId = String(employee.user)
      if (!selfEvaluations.has(userId)) {
        selfEvaluations.set(userId, {
          userId,
          employeeId: String(employee._id),
        })
      }
    }
  }

  // Total real de pendientes por evaluador (incluye asignaciones previas).
  const pendingByEvaluator = new Map<string, number>()
  for (const [userId, ids] of evaluatorEmployeeIds) {
    const total = await Evaluation.countDocuments({
      tenantId,
      periodLabel: campaign.name,
      evaluator: { $in: [...ids] },
      status: { $ne: 'approved' },
    })
    if (total > 0) pendingByEvaluator.set(userId, total)
  }

  // Avisos consolidados: uno por evaluador y uno por autoevaluación.
  // Si existe uno sin leer se actualiza; si ya se leyó se crea uno nuevo.
  let alertsCreated = 0
  let alertsUpdated = 0
  const campaignId = String(campaign._id)

  const publish = (alert: Record<string, unknown>) => {
    publishAlert({
      _id: String(alert._id),
      employee: alert.employee ? String(alert.employee) : '',
      user: String(alert.user),
      module: 'evaluation',
      type: 'info',
      message: String(alert.message ?? ''),
      read: false,
      count: Number(alert.count ?? 1),
      alertKey: String(alert.alertKey ?? ''),
      createdAt: alert.createdAt,
    })
  }

  for (const [userId, total] of pendingByEvaluator) {
    const dedupeKey = `evaluation_pending:${campaignId}`
    const message = `Tienes ${total} ${
      total === 1 ? 'evaluación pendiente' : 'evaluaciones pendientes'
    } (campaña ${campaign.name})`
    const existing = await Alert.findOne({
      tenantId,
      user: userId,
      dedupeKey,
      read: false,
    })
    if (existing) {
      existing.count = total
      existing.message = message
      await existing.save()
      alertsUpdated++
      publish(existing.toObject())
    } else {
      const alert = await Alert.create({
        tenantId,
        user: userId,
        employee: null,
        dedupeKey,
        module: 'evaluation',
        type: 'info',
        message,
        alertKey: 'evaluation_pending',
        targetRoles: [],
        count: total,
      })
      alertsCreated++
      publish(alert.toObject())
    }
  }

  for (const { userId, employeeId } of selfEvaluations.values()) {
    const dedupeKey = `evaluation_self:${campaignId}`
    const message = `Tu autoevaluación está disponible (campaña ${campaign.name})`
    const existing = await Alert.findOne({
      tenantId,
      user: userId,
      dedupeKey,
      read: false,
    })
    if (existing) {
      existing.count = 1
      existing.message = message
      await existing.save()
      alertsUpdated++
      publish(existing.toObject())
    } else {
      const alert = await Alert.create({
        tenantId,
        user: userId,
        employee: employeeId,
        dedupeKey,
        module: 'evaluation',
        type: 'info',
        message,
        alertKey: 'evaluation_self',
        targetRoles: [],
        count: 1,
      })
      alertsCreated++
      publish(alert.toObject())
    }
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
      alertsCreated,
      alertsUpdated,
      skippedNoEvaluatorUser,
    },
  })

  return {
    created,
    skippedNoTemplate,
    skippedExisting,
    alertsCreated,
    alertsUpdated,
    skippedNoEvaluatorUser,
  }
})
