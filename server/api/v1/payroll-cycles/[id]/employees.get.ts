import { PayrollCycle } from '~~/server/models/PayrollCycle'
import { Employee } from '~~/server/models/Employee'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import {
  mongoIdSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'

/** Empleados asignados al ciclo (el por defecto incluye los sin ciclo). */
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

  const filter: Record<string, unknown> = { tenantId, active: true }
  filter.payrollCycle = cycle.isDefault
    ? { $in: [null, cycle._id] }
    : cycle._id

  const items = await Employee.find(filter)
    .select('firstName lastName document position')
    .sort({ firstName: 1, lastName: 1 })
    .lean()

  return { items, cycleName: cycle.name, isDefault: cycle.isDefault }
})
