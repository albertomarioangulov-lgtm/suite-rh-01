import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import {
  mongoIdSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'
import { recalculatePayroll } from '~~/server/services/payroll.service'

/** Recalcula la nómina desde asistencia (solo borrador). */
export default defineEventHandler(async (event) => {
  const { userId } = await authorize(event, [
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.HR,
  ])

  const id = validateWithSchema(
    mongoIdSchema,
    getRouterParam(event, 'id') || '',
  )
  return recalculatePayroll(id, userId)
})
