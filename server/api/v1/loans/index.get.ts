import type { QueryFilter } from 'mongoose'
import { Loan, type ILoan } from '~~/server/models/Loan'
import { ROLES } from '~~/shared/auth'
import { requireFlag } from '~~/server/utils/tenant'
import { FEATURE_FLAGS } from '~~/shared/feature-flags'
import { paginationSchema, validateWithSchema } from '~~/server/utils/validation-schemas'

/** Lista de préstamos con filtros (empleado, estado) y paginación. */
export default defineEventHandler(async (event) => {
  await requireFlag(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR], FEATURE_FLAGS.LOANS)

  const query = validateWithSchema(paginationSchema, getQuery(event))
  const { employeeId, status } = getQuery(event) as Record<string, string | undefined>

  const filter: QueryFilter<ILoan> = {}
  if (employeeId) filter.employee = employeeId
  if (status) filter.status = status as ILoan['status']

  const total = await Loan.countDocuments(filter)
  const items = await Loan.find(filter)
    .sort({ createdAt: -1 })
    .skip((query.page - 1) * query.limit)
    .limit(query.limit)
    .populate('employee', 'firstName lastName document position')
    .lean()

  return {
    items: items.map((item) => ({ ...item, _id: String(item._id) })),
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit),
  }
})
