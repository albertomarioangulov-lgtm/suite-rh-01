import { Payroll } from '~~/server/models/Payroll'
import { Employee } from '~~/server/models/Employee'
import { ROLES, roleIsAllowed, type UserRole } from '~~/shared/auth'
import { requireAuth } from '~~/server/utils/authorize'
import {
  mongoIdSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'

/** Historial de nóminas de un empleado. */
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

  const payrolls = await Payroll.getByEmployee(employeeId)
  return payrolls.map((payroll) => {
    const entry = (payroll.employees ?? []).find(
      (item) => String(item.employee) === employeeId,
    )
    return {
      _id: payroll._id.toString(),
      periodStart: payroll.periodStart,
      periodEnd: payroll.periodEnd,
      status: payroll.status,
      totalEarned: entry?.devengados?.total ?? 0,
      totalDeducted: entry?.deducciones?.total ?? 0,
      totalToPay: entry?.totalToPay ?? 0,
    }
  })
})
