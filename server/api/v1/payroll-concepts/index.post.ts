import { PayrollConcept } from '~~/server/models/PayrollConcept'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import {
  payrollConceptSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'

/** Crea un concepto de nómina para la empresa. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])

  const tenantId = await getTenantId(event)
  const body = await readBody(event)
  const data = validateWithSchema(payrollConceptSchema, body)

  const existing = await PayrollConcept.findOne({
    tenantId,
    code: data.code,
  })
  if (existing) {
    throw createError({
      statusCode: 409,
      message: 'Ya existe un concepto con ese código.',
    })
  }

  const concept = await PayrollConcept.create({ ...data, tenantId })
  return concept.toJSON()
})
