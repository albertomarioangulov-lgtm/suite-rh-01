import { ROLES } from '~~/shared/auth'
import { requireFlag } from '~~/server/utils/tenant'
import { requireAuth } from '~~/server/utils/authorize'
import { Employee } from '~~/server/models/Employee'
import { createAbsence } from '~~/server/services/absence.service'
import {
  absenceCreateSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'
import { FEATURE_FLAGS } from '~~/shared/feature-flags'

/**
 * Solicitud de permiso/ausencia del empleado (autoservicio).
 * Se crea en estado pendiente y genera la alerta a RRHH/gerencia.
 */
export default defineEventHandler(async (event) => {
  await requireFlag(
    event,
    [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR, ROLES.EMPLOYEE],
    FEATURE_FLAGS.ABSENCES,
  )
  const { userId } = await requireAuth(event)

  const employee = await Employee.findOne({ user: userId }).select('_id')
  if (!employee) {
    throw createError({
      statusCode: 404,
      message: 'No tienes una ficha de empleado vinculada a tu cuenta.',
    })
  }

  const body = await readBody(event)
  const data = validateWithSchema(
    absenceCreateSchema.pick({
      type: true,
      startDate: true,
      endDate: true,
      supportDocument: true,
      observations: true,
    }),
    body,
  )

  return createAbsence(
    {
      employeeId: String(employee._id),
      type: data.type,
      startDate: data.startDate,
      endDate: data.endDate,
      supportDocument: data.supportDocument,
      observations: data.observations,
      status: 'pending',
    },
    userId,
  )
})
