import { PayrollCycle } from '~~/server/models/PayrollCycle'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import {
  payrollCycleSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'

/** Crea un ciclo de pago. El ciclo por defecto se gestiona solo. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])

  const tenantId = await getTenantId(event)
  const body = await readBody(event)
  const data = validateWithSchema(payrollCycleSchema, body)

  const existing = await PayrollCycle.findOne({ tenantId, name: data.name })
  if (existing) {
    throw createError({
      statusCode: 409,
      message: 'Ya existe un ciclo con ese nombre.',
    })
  }

  const cycle = await PayrollCycle.create({ ...data, tenantId })
  return cycle.toJSON()
})
