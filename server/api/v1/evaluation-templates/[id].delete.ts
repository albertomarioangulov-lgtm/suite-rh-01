import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import { EvaluationTemplate } from '~~/server/models/EvaluationTemplate'

export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN])
  const tenantId = await getTenantId(event)
  const id = String(getRouterParam(event, 'id') ?? '')

  const result = await EvaluationTemplate.deleteOne({ _id: id, tenantId })
  if (result.deletedCount === 0) {
    throw createError({ statusCode: 404, message: 'Plantilla no encontrada' })
  }
  return { success: true }
})
