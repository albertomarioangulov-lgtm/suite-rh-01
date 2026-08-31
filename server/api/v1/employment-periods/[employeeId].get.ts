import { Employee } from '~~/server/models/Employee'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getEmployeePeriods } from '~~/server/services/employment.service'
import { mongoIdSchema, validateWithSchema } from '~~/server/utils/validation-schemas'

/** Historial de períodos de vinculación de un empleado. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])
  const employeeId = validateWithSchema(
    mongoIdSchema,
    getRouterParam(event, 'employeeId') || '',
  )
  const periods = await getEmployeePeriods(employeeId)
  return { items: periods.map((period) => period.toJSON()) }
})
