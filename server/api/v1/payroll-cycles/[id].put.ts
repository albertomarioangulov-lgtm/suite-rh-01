import { PayrollCycle } from '~~/server/models/PayrollCycle'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import {
  mongoIdSchema,
  payrollCycleUpdateSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'

/** Actualiza un ciclo de pago. */
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
  const data = validateWithSchema(payrollCycleUpdateSchema, body)

  if (data.name && data.name !== cycle.name) {
    const existing = await PayrollCycle.findOne({
      tenantId,
      name: data.name,
      _id: { $ne: id },
    })
    if (existing) {
      throw createError({
        statusCode: 409,
        message: 'Ya existe un ciclo con ese nombre.',
      })
    }
  }

  if (data.name !== undefined) cycle.name = data.name
  if (data.frequency !== undefined) cycle.frequency = data.frequency
  if (data.description !== undefined)
    cycle.description = data.description ?? ''
  if (data.active !== undefined) {
    if (cycle.isDefault && !data.active) {
      throw createError({
        statusCode: 400,
        message: 'El ciclo por defecto no se puede desactivar.',
      })
    }
    cycle.active = data.active
  }
  if (data.sortOrder !== undefined) cycle.sortOrder = data.sortOrder

  await cycle.save()
  return cycle.toJSON()
})
