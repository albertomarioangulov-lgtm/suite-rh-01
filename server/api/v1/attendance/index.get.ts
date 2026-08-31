import type { QueryFilter } from 'mongoose'
import { Attendance, type IAttendance } from '~~/server/models/Attendance'
import { Employee } from '~~/server/models/Employee'
import { ROLES } from '~~/shared/auth'
import { getTenantId, requireFlag } from '~~/server/utils/tenant'
import { FEATURE_FLAGS } from '~~/shared/feature-flags'
import {
  paginationSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'

/** Lista de asistencia con paginación y filtros. Acceso: admin, manager, hr. */
export default defineEventHandler(async (event) => {
  await requireFlag(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR], FEATURE_FLAGS.ATTENDANCE)

  const tenantId = await getTenantId(event)
  if (!tenantId) {
    return { items: [], total: 0, page: 1, limit: 10, totalPages: 0 }
  }

  const query = validateWithSchema(paginationSchema, getQuery(event))
  const { employeeId, dateFrom, dateTo, status, search } = getQuery(event) as
    Record<string, string | undefined>

  const filter: QueryFilter<IAttendance> = {}
  filter.tenantId = tenantId
  if (employeeId) filter.employee = employeeId
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const ids = await Employee.find({
      tenantId,
      $or: [
        { firstName: { $regex: escaped, $options: 'i' } },
        { lastName: { $regex: escaped, $options: 'i' } },
        { document: { $regex: escaped, $options: 'i' } },
      ],
    })
      .select('_id')
      .lean()
    filter.employee = { $in: ids.map((employee) => employee._id) }
  }
  if (status) filter.status = status as IAttendance['status']
  if (dateFrom || dateTo) {
    filter.date = {
      ...(dateFrom ? { $gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { $lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
    }
  }

  const total = await Attendance.countDocuments(filter)
  const items = await Attendance.find(filter)
    .sort({ date: -1 })
    .skip((query.page - 1) * query.limit)
    .limit(query.limit)
    .populate('employee', 'firstName lastName document')
    .lean()

  return {
    items: items.map((item) => ({ ...item, _id: item._id.toString() })),
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit),
  }
})
