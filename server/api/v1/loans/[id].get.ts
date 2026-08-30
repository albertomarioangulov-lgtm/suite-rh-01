import { Loan } from '~~/server/models/Loan'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'

/** Detalle de un préstamo con su historial. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])
  const id = getRouterParam(event, 'id')

  const loan = await Loan.findById(id)
    .populate('employee', 'firstName lastName document position')
  if (!loan) {
    throw createError({ statusCode: 404, message: 'Préstamo no encontrado' })
  }
  return loan.toJSON()
})
