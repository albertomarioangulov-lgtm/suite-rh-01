import { Alert } from '~~/server/models/Alert'
import { AlertConfig } from '~~/server/models/AlertConfig'
import { User } from '~~/server/models/User'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'

/**
 * Alertas activas (sin leer) de la empresa, con el empleado asociado.
 * Acceso: admin, manager, hr.
 */
export default defineEventHandler(async (event) => {
  const { userId } = await authorize(event, [
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.HR,
  ])

  const tenantId = await getTenantId(event)
  if (!tenantId) {
    return { items: [], total: 0 }
  }

  // Roles destino según la configuración de alertas de la empresa.
  const config = await AlertConfig.getOrCreate(tenantId)
  const user = await User.findById(userId).select('role').lean()
  const role = (user?.role as string) ?? ''
  const enabledKeys = (config.rules ?? [])
    .filter((rule) => rule.enabled && rule.targetRoles.includes(role as never))
    .map((rule) => rule.key)

  const items = await Alert.find({
    tenantId,
    read: false,
    alertKey: { $in: enabledKeys },
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('employee', 'firstName lastName position document')
    .lean()

  return {
    items: items.map((item) => ({
      _id: String(item._id),
      employee: item.employee,
      module: item.module,
      type: item.type,
      message: item.message,
      read: item.read,
      alertKey: item.alertKey,
      createdAt: item.createdAt,
    })),
    total: items.length,
  }
})
