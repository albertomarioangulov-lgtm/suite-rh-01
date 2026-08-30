import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import {
  mongoIdSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'
import { cancelPayroll } from '~~/server/services/payroll.service'

/** Anula la nómina. Acceso: admin. */
export default defineEventHandler(async (event) => {
  const { userId } = await authorize(event, [ROLES.ADMIN])

  const id = validateWithSchema(
    mongoIdSchema,
    getRouterParam(event, 'id') || '',
  )
  return cancelPayroll(id, userId)
})
