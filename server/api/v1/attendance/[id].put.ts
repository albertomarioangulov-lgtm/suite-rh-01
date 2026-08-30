import { Attendance } from '~~/server/models/Attendance'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import {
  attendanceUpdateSchema,
  mongoIdSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'

/** Actualiza un registro SOLO si está pendiente. Acceso: admin, manager, hr. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])

  const id = validateWithSchema(
    mongoIdSchema,
    getRouterParam(event, 'id') || '',
  )
  const record = await Attendance.findById(id)
  if (!record) {
    throw createError({
      statusCode: 404,
      message: 'Registro de asistencia no encontrado',
    })
  }
  if (record.status !== 'pending') {
    throw createError({
      statusCode: 400,
      message: 'Solo se pueden editar registros pendientes.',
    })
  }

  const body = await readBody(event)
  const data = validateWithSchema(attendanceUpdateSchema, body)

  if (data.clockIn !== undefined) {
    record.clockIn = data.clockIn
    record.date = data.clockIn
  }
  if (data.clockOut !== undefined) record.clockOut = data.clockOut
  if (data.observations !== undefined) record.observations = data.observations

  try {
    await record.save()
  } catch (error: any) {
    if (error?.message?.includes('Ya existe un registro')) {
      throw createError({ statusCode: 409, message: error.message })
    }
    throw error
  }

  return record.toJSON()
})
