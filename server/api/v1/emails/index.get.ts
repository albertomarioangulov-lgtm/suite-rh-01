import type { QueryFilter } from 'mongoose'
import { EmailLog, type IEmailLog } from '~~/server/models/EmailLog'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { paginationSchema, validateWithSchema } from '~~/server/utils/validation-schemas'

/** Historial de correos enviados (solo admin), con búsqueda por destinatario. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN])

  const query = validateWithSchema(paginationSchema, getQuery(event))
  const filter: QueryFilter<IEmailLog> = {}
  if (query.search) {
    filter.email = { $regex: query.search, $options: 'i' }
  }

  const total = await EmailLog.countDocuments(filter)
  const items = await EmailLog.find(filter)
    .sort({ lastEventAt: -1 })
    .skip((query.page - 1) * query.limit)
    .limit(query.limit)
    .lean()

  return {
    items: items.map((item) => ({ ...item, _id: item._id.toString() })),
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit),
  }
})
