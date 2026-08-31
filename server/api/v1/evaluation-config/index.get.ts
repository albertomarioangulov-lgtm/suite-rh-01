import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import { EvaluationConfig } from '~~/server/models/EvaluationConfig'

/** Configuración de evaluaciones del tenant (o null si no existe). */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])
  const tenantId = await getTenantId(event)
  const config = await EvaluationConfig.findOne({ tenantId }).lean()
  if (!config) return null
  return { id: String(config._id), ...config, _id: undefined }
})
