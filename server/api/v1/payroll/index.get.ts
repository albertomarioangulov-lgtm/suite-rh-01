import type { QueryFilter } from 'mongoose'
import { Payroll, type IPayroll } from '~~/server/models/Payroll'
import { ROLES } from '~~/shared/auth'
import { getTenantId, requireFlag } from '~~/server/utils/tenant'
import { FEATURE_FLAGS } from '~~/shared/feature-flags'
import {
  paginationSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'

/** Lista de nóminas. Acceso: admin, manager, hr. */
export default defineEventHandler(async (event) => {
  await requireFlag(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR], FEATURE_FLAGS.PAYROLL)

  const tenantId = await getTenantId(event)
  if (!tenantId) {
    return { items: [], total: 0, page: 1, limit: 0, totalPages: 0 }
  }

  const query = validateWithSchema(paginationSchema, getQuery(event))
  const { status, dateFrom, dateTo } = getQuery(event) as Record<
    string,
    string | undefined
  >

  const filter: QueryFilter<IPayroll> = { tenantId }
  if (status) filter.status = status as IPayroll['status']
  if (dateFrom || dateTo) {
    filter.periodStart = {
      ...(dateFrom ? { $gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { $lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
    }
  }

  const total = await Payroll.countDocuments(filter)
  const items = await Payroll.find(filter)
    .sort({ periodStart: -1 })
    .skip((query.page - 1) * query.limit)
    .limit(query.limit)
    .lean()

  return {
    items: items.map((item) => ({
      ...item,
      _id: item._id.toString(),
      employeeCount: (item.employees ?? []).length,
    })),
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit),
  }
})
