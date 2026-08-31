import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { AuditLog } from '~~/server/models/AuditLog'

/** Historial de la campaña (creación, cambios, generación, eliminación). */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.HR])
  const id = String(getRouterParam(event, 'id') ?? '')
  const history = await AuditLog.find({
    module: 'evaluation-campaign',
    entityId: id,
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean()
  return {
    items: history.map((entry) => ({
      id: String(entry._id),
      action: entry.action,
      description: entry.description ?? '',
      userName: entry.userName ?? '',
      changes: entry.changes ?? {},
      createdAt: entry.createdAt,
    })),
  }
})
