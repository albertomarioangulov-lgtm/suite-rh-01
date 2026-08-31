import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import { EvaluationConfigHistory } from '~~/server/models/EvaluationConfigHistory'

/** Historial de cambios de la configuración de evaluaciones. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.HR])
  const tenantId = await getTenantId(event)
  const history = await EvaluationConfigHistory.find({ tenantId })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean()
  return {
    items: history.map((entry) => ({
      id: String(entry._id),
      configSnapshot: entry.configSnapshot,
      changes: entry.changes,
      comment: entry.comment ?? '',
      userName: entry.userName ?? '',
      createdAt: entry.createdAt,
    })),
  }
})
