import { ROLES } from '~~/shared/auth'
import { requireFlag } from '~~/server/utils/tenant'
import { FEATURE_FLAGS } from '~~/shared/feature-flags'
import {
  attendanceCreateSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'
import { createAttendance } from '~~/server/services/attendance.service'

/** Crea un registro de asistencia (cálculo automático). Acceso: admin, manager, hr. */
export default defineEventHandler(async (event) => {
  const { userId } = await requireFlag(event, [
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.HR,
  ], FEATURE_FLAGS.ATTENDANCE)

  const body = await readBody(event)
  const data = validateWithSchema(attendanceCreateSchema, body)

  return createAttendance(data, userId)
})
