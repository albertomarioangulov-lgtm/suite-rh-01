import { PayrollCycle } from '~~/server/models/PayrollCycle'
import { Employee } from '~~/server/models/Employee'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import {
  mongoIdSchema,
  payrollCycleAssignSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'

/** Asigna en lote empleados (sin ciclo) al ciclo indicado. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])

  const tenantId = await getTenantId(event)
  const id = validateWithSchema(
    mongoIdSchema,
    getRouterParam(event, 'id') || '',
  )
  const cycle = await PayrollCycle.findOne({ _id: id, tenantId })
  if (!cycle) {
    throw createError({ statusCode: 404, message: 'Ciclo no encontrado' })
  }

  const body = await readBody(event)
  const data = validateWithSchema(payrollCycleAssignSchema, body)

  const result = await Employee.updateMany(
    { _id: { $in: data.employeeIds }, tenantId },
    { $set: { payrollCycle: cycle._id } },
  )

  return { updated: result.modifiedCount }
})
