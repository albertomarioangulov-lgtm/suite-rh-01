import { Attendance } from '~~/server/models/Attendance'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import {
  attendanceStatusSchema,
  mongoIdSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'

/** Aprueba o rechaza un registro (según `status` del body). */
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

  const body = await readBody(event)
  const data = validateWithSchema(attendanceStatusSchema, body)

  record.status = data.status
  if (data.observations !== undefined) record.observations = data.observations
  await record.save()

  return record.toJSON()
})
