import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { loanPaymentSchema, validateWithSchema } from '~~/server/utils/validation-schemas'
import { addManualPayment } from '~~/server/services/loan.service'

/** Registra un abono manual a un préstamo. */
export default defineEventHandler(async (event) => {
  const { userId } = await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'ID de préstamo inválido' })
  }
  const body = await readBody(event)
  const data = validateWithSchema(loanPaymentSchema, body)
  return addManualPayment(id, data.amount, userId)
})
