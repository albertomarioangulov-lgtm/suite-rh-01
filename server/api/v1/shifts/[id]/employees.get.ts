import { Employee } from '~~/server/models/Employee'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import {
  mongoIdSchema,
  paginationSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'

/** Empleados asignados a un turno (paginado). Acceso: admin, manager, hr. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])

  const id = validateWithSchema(
    mongoIdSchema,
    getRouterParam(event, 'id') || '',
  )
  const query = validateWithSchema(paginationSchema, getQuery(event))
  const filter = { assignedShift: id }

  const total = await Employee.countDocuments(filter)
  const items = await Employee.find(filter)
    .skip((query.page - 1) * query.limit)
    .limit(query.limit)
    .select('firstName lastName document email active')
    .lean()

  return {
    items: items.map((item) => ({ ...item, _id: item._id.toString() })),
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit),
  }
})
