import { Payroll } from '~~/server/models/Payroll'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import {
  mongoIdSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'

/** Detalle por empleado de una nómina. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])

  const id = validateWithSchema(
    mongoIdSchema,
    getRouterParam(event, 'id') || '',
  )
  const payroll = await Payroll.findById(id)
    .populate('employees.employee', 'firstName lastName document')
  if (!payroll) {
    throw createError({ statusCode: 404, message: 'Nómina no encontrada' })
  }

  return payroll.employees ?? []
})
