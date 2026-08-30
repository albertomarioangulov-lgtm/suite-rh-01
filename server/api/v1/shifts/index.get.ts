import type { QueryFilter } from 'mongoose'
import { Shift, type IShift } from '~~/server/models/Shift'
import { ROLES } from '~~/shared/auth'
import { getTenantId, requireFlag } from '~~/server/utils/tenant'
import { FEATURE_FLAGS } from '~~/shared/feature-flags'
import {
  paginationSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'

/** Lista de turnos con paginación y filtros. Acceso: admin, manager, hr. */
export default defineEventHandler(async (event) => {
  await requireFlag(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR], FEATURE_FLAGS.SHIFTS)

  const tenantId = await getTenantId(event)
  if (!tenantId) {
    return { items: [], total: 0, page: 1, limit: 0, totalPages: 0 }
  }

  const query = validateWithSchema(paginationSchema, getQuery(event))
  const { type, active, search } = getQuery(event) as Record<
    string,
    string | undefined
  >

  const filter: QueryFilter<IShift> = { tenantId }
  if (type) filter.type = type as IShift['type']
  if (active === 'true') filter.active = true
  if (active === 'false') filter.active = false
  if (search) filter.name = { $regex: search, $options: 'i' }

  const total = await Shift.countDocuments(filter)
  const items = await Shift.find(filter)
    .sort({ name: 1 })
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
