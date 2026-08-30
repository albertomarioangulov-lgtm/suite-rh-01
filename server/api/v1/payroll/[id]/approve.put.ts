import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import {
  mongoIdSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'
import { approvePayroll } from '~~/server/services/payroll.service'

/** Aprueba la nómina. Acceso: admin, manager. */
export default defineEventHandler(async (event) => {
  const { userId } = await authorize(event, [ROLES.ADMIN, ROLES.MANAGER])

  const id = validateWithSchema(
    mongoIdSchema,
    getRouterParam(event, 'id') || '',
  )
  return approvePayroll(id, userId)
})
