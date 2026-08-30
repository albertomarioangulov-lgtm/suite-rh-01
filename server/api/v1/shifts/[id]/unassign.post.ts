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

/** Desasigna un turno de uno o varios empleados. */
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

  const result = await Employee.updateMany(
    { _id: { $in: employeeIds }, assignedShift: id },
    { $unset: { assignedShift: 1 } },
  )
  await logAudit({
    module: 'shift',
    action: 'unassign',
    entityId: id,
    userId,
    description: `Turno "${shift.name}" desasignado de ${result.modifiedCount} empleado(s)`,
  })

  return { success: true, unassigned: result.modifiedCount }
})
