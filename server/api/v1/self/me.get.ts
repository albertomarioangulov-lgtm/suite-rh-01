import { requireAuth } from '~~/server/utils/authorize'
import { Employee } from '~~/server/models/Employee'

/**
 * Perfil del empleado vinculado al usuario de la sesión (autoservicio).
 */
export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event)

  const employee = await Employee.findOne({ user: userId })
    .populate('department', 'name')
    .populate('manager', 'firstName lastName position')
    .lean()
  if (!employee) {
    throw createError({
      statusCode: 404,
      message: 'No tienes una ficha de empleado vinculada a tu cuenta.',
    })
  }

  const manager = employee.manager as
    | { firstName?: string; lastName?: string; position?: string }
    | undefined
  const department = employee.department as { name?: string } | undefined

  return {
    id: String(employee._id),
    firstName: employee.firstName,
    lastName: employee.lastName,
    document: employee.document,
    email: employee.email ?? '',
    position: employee.position ?? '',
    department: department?.name ?? '',
    contractType: employee.tipoContrato || employee.contractType || '',
    hireDate: employee.hireDate ?? null,
    baseSalary: employee.baseSalary ?? 0,
    manager: manager
      ? `${manager.firstName ?? ''} ${manager.lastName ?? ''}`.trim() ||
        manager.position ||
        ''
      : '',
    active: employee.active ?? true,
  }
})
