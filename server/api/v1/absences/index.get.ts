import type { QueryFilter } from 'mongoose'
import { Absence, type IAbsence } from '~~/server/models/Absence'
import { ROLES } from '~~/shared/auth'
import { getTenantId, requireFlag } from '~~/server/utils/tenant'
import { FEATURE_FLAGS } from '~~/shared/feature-flags'
import { absenceFilterSchema, validateWithSchema } from '~~/server/utils/validation-schemas'

/**
 * Lista de ausencias con paginación y filtros
 * (empleado, tipo, estado, rango de fechas).
 * Acceso: admin, manager, hr.
 */
export default defineEventHandler(async (event) => {
  await requireFlag(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR], FEATURE_FLAGS.ABSENCES)

  const tenantId = await getTenantId(event)
  if (!tenantId) {
    return { items: [], total: 0, page: 1, limit: 10, totalPages: 0 }
  }

  const query = validateWithSchema(absenceFilterSchema, getQuery(event))
  const filter: QueryFilter<IAbsence> = {}
  filter.tenantId = tenantId

  if (query.employeeId) filter.employee = query.employeeId
  if (query.type) filter.type = query.type
  if (query.status) filter.status = query.status
  if (query.dateFrom || query.dateTo) {
    filter.startDate = {
      ...(query.dateFrom ? { $gte: new Date(`${query.dateFrom}T00:00:00.000Z`) } : {}),
      ...(query.dateTo ? { $lte: new Date(`${query.dateTo}T23:59:59.999Z`) } : {}),
    }
  }

  const total = await Absence.countDocuments(filter)
  const items = await Absence.find(filter)
    .sort({ startDate: -1, createdAt: -1 })
    .skip((query.page - 1) * query.limit)
    .limit(query.limit)
    .populate('employee', 'firstName lastName document position')
    .populate('approvedBy', 'name email')
    .lean()

  return {
    items: items.map((item) => ({ ...item, _id: item._id.toString() })),
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit),
  }
})
