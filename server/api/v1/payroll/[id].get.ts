import { Payroll } from '~~/server/models/Payroll'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import {
  mongoIdSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'

/** Detalle de nómina. Acceso: admin, manager, hr. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])

  const id = validateWithSchema(
    mongoIdSchema,
    getRouterParam(event, 'id') || '',
  )
  const payroll = await Payroll.findById(id)
    .populate('tenantId', 'name nit')
    .populate('cycle', 'name frequency')
    .populate('employees.employee', 'firstName lastName document')
  if (!payroll) {
    throw createError({ statusCode: 404, message: 'Nómina no encontrada' })
  }

  return payroll.toJSON()
})
