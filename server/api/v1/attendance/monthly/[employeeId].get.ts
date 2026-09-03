import { Attendance } from '~~/server/models/Attendance'
import { Employee } from '~~/server/models/Employee'
import { ROLES, roleIsAllowed, type UserRole } from '~~/shared/auth'
import { requireAuth } from '~~/server/utils/authorize'
import {
  mongoIdSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'

/** Resumen mensual de un empleado (?month=1-12&year=YYYY). */
export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event)
  const employeeId = validateWithSchema(
    mongoIdSchema,
    getRouterParam(event, 'employeeId') || '',
  )

  const query = getQuery(event)
  const month = Number(query.month) || new Date().getMonth() + 1
  const year = Number(query.year) || new Date().getFullYear()

  const session = await getUserSession(event)
  const role = (session.user as { role?: UserRole } | undefined)?.role
  const canView =
    !!role &&
    roleIsAllowed(role, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])
  const employee = await Employee.findById(employeeId).select('user')
  if (!employee) {
    throw createError({ statusCode: 404, message: 'Empleado no encontrado' })
  }
  if (!canView && String(employee.user) !== userId) {
    throw createError({
      statusCode: 403,
      message: 'No tienes permisos para realizar esta acción.',
    })
  }

  const summary = await Attendance.getMonthlySummary(employeeId, month, year)
  return { month, year, summary }
})
