import { AlertConfig } from '~~/server/models/AlertConfig'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'

/** Configuración de alertas de la empresa (qué tipos y para qué roles). */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])

  const tenantId = await getTenantId(event)
  if (!tenantId) {
    return { rules: [] }
  }

  const config = await AlertConfig.getOrCreate(tenantId)
  return config.toJSON()
})
