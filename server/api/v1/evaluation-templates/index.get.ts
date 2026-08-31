import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import { EvaluationTemplate } from '~~/server/models/EvaluationTemplate'

/** Lista de plantillas de evaluación del tenant. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])
  const tenantId = await getTenantId(event)
  const positionId = getQuery(event).positionId

  const filter: Record<string, unknown> = { tenantId }
  if (positionId) filter.positionId = positionId

  const templates = await EvaluationTemplate.find(filter)
    .sort({ updatedAt: -1 })
    .populate('positionId', 'title')
    .lean()

  return {
    items: templates.map((template) => ({
      id: String(template._id),
      name: template.name,
      description: template.description ?? '',
      positionId: template.positionId?._id
        ? String(template.positionId._id)
        : '',
      position: template.positionId?.title ?? '',
      sections: template.sections ?? [],
      active: template.active,
    })),
  }
})
