import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { loanCreateSchema, validateWithSchema } from '~~/server/utils/validation-schemas'
import { createLoan } from '~~/server/services/loan.service'

/** Crea un préstamo para un empleado. Acceso: admin, manager, hr. */
export default defineEventHandler(async (event) => {
  const { userId } = await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])
  const body = await readBody(event)
  const data = validateWithSchema(loanCreateSchema, body)

  return createLoan(
    {
      employeeId: data.employeeId,
      description: data.description,
      principal: data.principal,
      interestRate: data.interestRate,
      termMonths: data.termMonths,
      startDate: data.startDate,
    },
    userId,
  )
})
