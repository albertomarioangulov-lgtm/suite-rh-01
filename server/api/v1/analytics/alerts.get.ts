import { Alert } from '~~/server/models/Alert'
import { AlertConfig } from '~~/server/models/AlertConfig'
import { User } from '~~/server/models/User'
import { ROLES } from '~~/shared/auth'
import { requireAuth } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'

/**
 * Alertas activas (sin leer):
 * - Admin/manager/HR: alertas operativas de la empresa + de evaluación.
 * - Otros roles: solo sus alertas personales (evaluaciones y autoevaluación).
 */
export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event)

  const tenantId = await getTenantId(event)
  if (!tenantId) {
    return { items: [], total: 0 }
  }

  const user = await User.findById(userId).select('role').lean()
  const role = (user?.role as string) ?? ''
  const isStaff = ![ROLES.ADMIN, ROLES.MANAGER, ROLES.HR].includes(
    role as never,
  )

  const baseFilter: Record<string, unknown> = {
    tenantId,
    read: false,
  }
  if (isStaff) {
    baseFilter.user = userId
    baseFilter.alertKey = {
      $in: [
        'evaluation_pending',
        'evaluation_self',
        'absence_approved',
        'absence_rejected',
      ],
    }
  } else {
    const config = await AlertConfig.getOrCreate(tenantId)
    const enabledKeys = (config.rules ?? [])
      .filter((rule) => rule.enabled && rule.targetRoles.includes(role as never))
      .map((rule) => rule.key)
    // Las alertas de evaluación siempre se muestran al equipo directivo/RRHH.
    baseFilter.alertKey = {
      $in: [...enabledKeys, 'evaluation_pending', 'evaluation_self'],
    }
  }

  const items = await Alert.find(baseFilter)
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('employee', 'firstName lastName position document')
    .lean()

  return {
    items: items.map((item) => ({
      _id: String(item._id),
      employee: item.employee,
      userId: item.user ? String(item.user) : null,
      module: item.module,
      type: item.type,
      message: item.message,
      read: item.read,
      alertKey: item.alertKey,
      count: item.count ?? 1,
      createdAt: item.createdAt,
    })),
    total: items.length,
  }
})
