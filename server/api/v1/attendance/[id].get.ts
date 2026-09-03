import { Attendance } from '~~/server/models/Attendance'
import { ROLES, roleIsAllowed, type UserRole } from '~~/shared/auth'
import { requireAuth } from '~~/server/utils/authorize'
import {
  mongoIdSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'

/**
 * Detalle de un registro. Acceso: admin, manager, hr o el propio empleado.
 */
export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event)
  const id = validateWithSchema(
    mongoIdSchema,
    getRouterParam(event, 'id') || '',
  )

  const record = await Attendance.findById(id)
    .populate('employee', 'firstName lastName document user')
    .populate('tenantId', 'name nit')
  if (!record) {
    throw createError({
      statusCode: 404,
      message: 'Registro de asistencia no encontrado',
    })
  }

  const session = await getUserSession(event)
  const role = (session.user as { role?: UserRole } | undefined)?.role
  const canView =
    !!role &&
    roleIsAllowed(role, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])
  const employee = (record.employee as { user?: { toString?: () => string } } | null)
  const employeeUser = employee?.user?.toString?.()
  const isSelf = employeeUser === userId

  if (!canView && !isSelf) {
    throw createError({
      statusCode: 403,
      message: 'No tienes permisos para realizar esta acción.',
    })
  }

  return record.toJSON()
})
