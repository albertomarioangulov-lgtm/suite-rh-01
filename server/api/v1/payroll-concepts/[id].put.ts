import { PayrollConcept } from '~~/server/models/PayrollConcept'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import {
  mongoIdSchema,
  payrollConceptUpdateSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'

/** Actualiza un concepto de nómina. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])

  const tenantId = await getTenantId(event)
  const id = validateWithSchema(
    mongoIdSchema,
    getRouterParam(event, 'id') || '',
  )
  const concept = await PayrollConcept.findOne({ _id: id, tenantId })
  if (!concept) {
    throw createError({ statusCode: 404, message: 'Concepto no encontrado' })
  }

  const body = await readBody(event)
  const data = validateWithSchema(payrollConceptUpdateSchema, body)

  if (data.code && data.code !== concept.code) {
    const existing = await PayrollConcept.findOne({
      tenantId,
      code: data.code,
      _id: { $ne: id },
    })
    if (existing) {
      throw createError({
        statusCode: 409,
        message: 'Ya existe un concepto con ese código.',
      })
    }
  }

  if (data.code !== undefined) concept.code = data.code
  if (data.name !== undefined) concept.name = data.name
  if (data.description !== undefined) concept.description = data.description ?? ''
  if (data.dianBlock !== undefined) concept.dianBlock = data.dianBlock
  if (data.calculation !== undefined) concept.calculation = data.calculation
  if (data.value !== undefined) concept.value = data.value
  if (data.active !== undefined) concept.active = data.active
  if (data.sortOrder !== undefined) concept.sortOrder = data.sortOrder

  await concept.save()
  return concept.toJSON()
})
