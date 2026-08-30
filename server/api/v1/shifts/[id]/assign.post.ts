import { Shift } from '~~/server/models/Shift'
import { Employee } from '~~/server/models/Employee'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { logAudit } from '~~/server/utils/audit'
import {
  mongoIdSchema,
  shiftAssignSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'
import { checkEmployeeConflicts } from '~~/server/services/shift.service'

/** Asigna un turno a uno o varios empleados. */
export default defineEventHandler(async (event) => {
  const { userId } = await authorize(event, [
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.HR,
  ])

  const id = validateWithSchema(
    mongoIdSchema,
    getRouterParam(event, 'id') || '',
  )
  const shift = await Shift.findById(id)
  if (!shift) {
    throw createError({ statusCode: 404, message: 'Turno no encontrado' })
  }

  const body = await readBody(event)
  const { employeeIds } = validateWithSchema(shiftAssignSchema, body)

  const employees = await Employee.find({ _id: { $in: employeeIds } })
  if (employees.length !== employeeIds.length) {
    throw createError({
      statusCode: 400,
      message: 'Uno o más empleados no existen.',
    })
  }
  const foreign = employees.filter(
    (employee) => String(employee.tenantId) !== String(shift.tenantId),
  )
  if (foreign.length > 0) {
    throw createError({
      statusCode: 400,
      message: 'Solo se pueden asignar empleados de la misma empresa.',
    })
  }

  const conflicts = await checkEmployeeConflicts(id, employeeIds)
  if (conflicts.length > 0) {
    throw createError({
      statusCode: 409,
      message: `Ya tienen otro turno asignado: ${conflicts
        .map((e) => `${e.firstName} ${e.lastName}`)
        .join(', ')}`,
    })
  }

  await Employee.updateMany(
    { _id: { $in: employeeIds } },
    { assignedShift: id },
  )
  await logAudit({
    module: 'shift',
    action: 'assign',
    entityId: id,
    userId,
    description: `Turno "${shift.name}" asignado a ${employeeIds.length} empleado(s)`,
  })

  return { success: true, assigned: employeeIds.length }
})
