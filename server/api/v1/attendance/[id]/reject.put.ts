import { Attendance } from '~~/server/models/Attendance'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import {
  mongoIdSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'

/** Rechaza un registro de asistencia. Acceso: admin, manager, hr. */
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

  record.status = 'rejected'
  await record.save()
  return record.toJSON()
})
