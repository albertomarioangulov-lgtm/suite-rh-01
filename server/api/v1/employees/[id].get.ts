import { Employee } from '~~/server/models/Employee'
import { ROLES, type UserRole } from '~~/shared/auth'
import { requireAuth } from '~~/server/utils/authorize'
import {
  mongoIdSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'

/**
 * Detalle de empleado con empresa y usuario poblados.
 * Acceso: admin, manager, hr o el propio empleado.
 */
export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event)
  const id = validateWithSchema(
    mongoIdSchema,
    getRouterParam(event, 'id') || '',
  )

  const employee = await Employee.findById(id)
    .populate('tenantId', 'name nit')
    .populate('user', 'name email active role')
    .populate('department', 'name')
    .populate('manager', 'firstName lastName')
  if (!employee) {
    throw createError({
      statusCode: 404,
      message: 'Empleado no encontrado',
    })
  }

  const session = await getUserSession(event)
  const role = (session.user as { role?: UserRole } | undefined)?.role
  const canView =
    !!role && ([ROLES.ADMIN, ROLES.MANAGER, ROLES.HR] as UserRole[]).includes(role)
  const isSelf = String(employee.user) === userId
  if (!canView && !isSelf) {
    throw createError({
      statusCode: 403,
      message: 'No tienes permisos para realizar esta acción.',
    })
  }

  return employee.toJSON()
})
