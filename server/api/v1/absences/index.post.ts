import { ROLES } from '~~/shared/auth'
import { requireFlag } from '~~/server/utils/tenant'
import { FEATURE_FLAGS } from '~~/shared/feature-flags'
import {
  absenceCreateSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'
import { createAbsence } from '~~/server/services/absence.service'

/** Crea una ausencia/permiso/incapacidad. Acceso: admin, manager, hr. */
export default defineEventHandler(async (event) => {
  const { userId } = await requireFlag(event, [
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.HR,
  ], FEATURE_FLAGS.ABSENCES)
  const body = await readBody(event)
  const data = validateWithSchema(absenceCreateSchema, body)

  return createAbsence(
    {
      employeeId: data.employeeId,
      type: data.type,
      startDate: data.startDate,
      endDate: data.endDate,
      scheduledRestDate: data.scheduledRestDate ?? null,
      supportDocument: data.supportDocument,
      observations: data.observations,
      status: data.status,
    },
    userId,
  )
})
