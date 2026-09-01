import { AlertConfig } from '~~/server/models/AlertConfig'
import { requireAuth } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'

/**
 * Configuración de alertas de la empresa (intervalo de polling y reglas).
 * Acceso: cualquier usuario autenticado — la campana necesita el intervalo
 * para funcionar también para empleados (avisos de evaluación/ausencias).
 */
export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const tenantId = await getTenantId(event)
  if (!tenantId) {
    return { rules: [] }
  }

  const config = await AlertConfig.getOrCreate(tenantId)
  return config.toJSON()
})
