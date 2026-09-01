import { PayrollCycle } from '~~/server/models/PayrollCycle'
import { Employee } from '~~/server/models/Employee'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import {
  mongoIdSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'

/** Elimina un ciclo de pago (no el por defecto ni uno con empleados). */
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
  if (cycle.isDefault) {
    throw createError({
      statusCode: 400,
      message: 'El ciclo por defecto no se puede eliminar.',
    })
  }

  const assigned = await Employee.countDocuments({
    tenantId,
    payrollCycle: id,
  })
  if (assigned > 0) {
    throw createError({
      statusCode: 409,
      message: `Reasigna los ${assigned} empleados del ciclo antes de eliminarlo.`,
    })
  }

  await PayrollCycle.deleteOne({ _id: id, tenantId })
  return { success: true }
})
