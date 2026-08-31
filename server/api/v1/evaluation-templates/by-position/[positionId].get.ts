import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import { validateWithSchema, mongoIdSchema } from '~~/server/utils/validation-schemas'
import { EvaluationTemplate } from '~~/server/models/EvaluationTemplate'

/** Plantilla activa para un cargo (o null). */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])
  const tenantId = await getTenantId(event)
  const positionId = validateWithSchema(
    mongoIdSchema,
    getRouterParam(event, 'positionId') || '',
  )

  const template = await EvaluationTemplate.findOne({
    tenantId,
    positionId,
    active: true,
  }).lean()

  if (!template) return null
  return {
    id: String(template._id),
    name: template.name,
    description: template.description ?? '',
    positionId: String(template.positionId),
    sections: template.sections ?? [],
  }
})
