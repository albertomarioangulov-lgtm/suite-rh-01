import type { QueryFilter } from 'mongoose'
import { AuditLog, type IAuditLog } from '~~/server/models/AuditLog'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { paginationSchema, validateWithSchema } from '~~/server/utils/validation-schemas'

/** Historial de cambios de configuración. Acceso: admin y manager. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER])

  const query = validateWithSchema(paginationSchema, getQuery(event))
  const filter: QueryFilter<IAuditLog> = { module: 'company' }

  const total = await AuditLog.countDocuments(filter)
  const items = await AuditLog.find(filter)
    .sort({ createdAt: -1 })
    .skip((query.page - 1) * query.limit)
    .limit(query.limit)
    .lean()

  return {
    items: items.map((item) => ({
      ...item,
      _id: item._id.toString(),
      entityId: item.entityId ? String(item.entityId) : undefined,
    })),
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit),
  }
})
