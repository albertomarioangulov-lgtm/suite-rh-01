import { Employee } from '~~/server/models/Employee'
import { terminateEmploymentPeriod } from '~~/server/services/employment.service'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import {
  mongoIdSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'

/**
 * Da de baja a un empleado (activo = false) registrando fecha y motivo,
 * para alimentar el cálculo de rotación. Acceso: solo admin.
 */
export default defineEventHandler(async (event) => {
  const { userId } = await authorize(event, [ROLES.ADMIN])
  const body = await readBody(event).catch(() => ({}))

  const id = validateWithSchema(
    mongoIdSchema,
    getRouterParam(event, 'id') || '',
  )
  const employee = await Employee.findById(id)
  if (!employee) {
    throw createError({
      statusCode: 404,
      message: 'Empleado no encontrado',
    })
  }

  const period = await terminateEmploymentPeriod(
    String(employee._id),
    new Date(),
    body?.terminationReason,
    userId,
  )

  return { success: true, periodId: String(period._id) }
})
