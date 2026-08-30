import type { QueryFilter } from 'mongoose'
import { AuditLog, type IAuditLog } from '~~/server/models/AuditLog'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import {
  mongoIdSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'

/** Historial de cambios de un turno (VTimeline). Acceso: admin, manager, hr. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])

  const id = validateWithSchema(
    mongoIdSchema,
    getRouterParam(event, 'id') || '',
  )
  const filter: QueryFilter<IAuditLog> = {
    module: 'shift',
    entityId: id as unknown as IAuditLog['entityId'],
  }
  const items = await AuditLog.find(filter).sort({ createdAt: -1 }).lean()

  return items.map((item) => ({
    ...item,
    _id: item._id.toString(),
    entityId: item.entityId ? String(item.entityId) : undefined,
  }))
})
