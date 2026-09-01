import { requireAuth } from '~~/server/utils/authorize'
import { Employee } from '~~/server/models/Employee'
import { Absence } from '~~/server/models/Absence'

/**
 * Cancela una solicitud de permiso/ausencia pendiente (autoservicio).
 * Solo el propio empleado y solo si sigue en estado pendiente.
 */
export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event)
  const id = String(getRouterParam(event, 'id') ?? '')

  const employee = await Employee.findOne({ user: userId }).select('_id')
  if (!employee) {
    throw createError({
      statusCode: 404,
      message: 'No tienes una ficha de empleado vinculada a tu cuenta.',
    })
  }

  const absence = await Absence.findOne({
    _id: id,
    employee: employee._id,
    status: 'pending',
  })
  if (!absence) {
    throw createError({
      statusCode: 404,
      message: 'La solicitud no existe o ya no está pendiente.',
    })
  }

  await Absence.deleteOne({ _id: absence._id })
  return { success: true }
})
