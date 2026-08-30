import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import {
  mongoIdSchema,
  payrollUpdateSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'
import { updatePayroll } from '~~/server/services/payroll.service'

/** Actualiza una nómina en borrador (ajustes manuales). */
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
  const body = await readBody(event)
  const data = validateWithSchema(payrollUpdateSchema, body)

  return updatePayroll(id, data, userId)
})
