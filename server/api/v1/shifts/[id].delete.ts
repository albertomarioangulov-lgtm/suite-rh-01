import { Shift } from '~~/server/models/Shift'
import { Employee } from '~~/server/models/Employee'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { logAudit } from '~~/server/utils/audit'
import {
  mongoIdSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'

/** Soft delete de turno (no permite si hay empleados activos asignados). */
export default defineEventHandler(async (event) => {
  const { userId } = await authorize(event, [ROLES.ADMIN])

  const id = validateWithSchema(
    mongoIdSchema,
    getRouterParam(event, 'id') || '',
  )
  const shift = await Shift.findById(id)
  if (!shift) {
    throw createError({ statusCode: 404, message: 'Turno no encontrado' })
  }

  const assigned = await Employee.countDocuments({
    assignedShift: id,
    active: true,
  })
  if (assigned > 0) {
    throw createError({
      statusCode: 409,
      message: `No se puede eliminar: hay ${assigned} empleado(s) activo(s) asignados.`,
    })
  }

  shift.active = false
  await shift.save()
  await logAudit({
    module: 'shift',
    action: 'update',
    entityId: id,
    userId,
    description: `Turno desactivado: ${shift.name}`,
  })

  return { success: true }
})
