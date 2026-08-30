import { Attendance } from '~~/server/models/Attendance'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import {
  mongoIdSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'

/** Elimina un registro de asistencia. Acceso: solo admin. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN])

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

  await record.deleteOne()
  return { success: true }
})
