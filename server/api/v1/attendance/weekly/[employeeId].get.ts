import { Attendance } from '~~/server/models/Attendance'
import { Employee } from '~~/server/models/Employee'
import { ROLES, type UserRole } from '~~/shared/auth'
import { requireAuth } from '~~/server/utils/authorize'
import {
  mongoIdSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'
import { getWeekRange } from '~~/shared/utils/datetime-helpers'

/** Resumen semanal de un empleado. Acceso: admin, manager, hr o el propio empleado. */
export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event)
  const employeeId = validateWithSchema(
    mongoIdSchema,
    getRouterParam(event, 'employeeId') || '',
  )

  const session = await getUserSession(event)
  const role = (session.user as { role?: UserRole } | undefined)?.role
  const canView =
    !!role &&
    ([ROLES.ADMIN, ROLES.MANAGER, ROLES.HR] as UserRole[]).includes(role)
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

  const [weekStart, weekEnd] = getWeekRange()
  const summary = await Attendance.getWeeklySummary(
    employeeId,
    weekStart,
    weekEnd,
  )
  const overtimeLimit = await Attendance.validateOvertimeLimit(
    employeeId,
    new Date(),
  )

  return { weekStart, weekEnd, summary, overtimeLimit }
})
