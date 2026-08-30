import { Loan } from '~~/server/models/Loan'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { loanUpdateSchema, validateWithSchema } from '~~/server/utils/validation-schemas'

/** Actualiza descripción o estado de un préstamo. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const data = validateWithSchema(loanUpdateSchema, body)

  const loan = await Loan.findById(id)
  if (!loan) {
    throw createError({ statusCode: 404, message: 'Préstamo no encontrado' })
  }
  if (data.description !== undefined) loan.description = data.description
  if (data.status !== undefined) loan.status = data.status
  await loan.save()
  return loan.toJSON()
})
