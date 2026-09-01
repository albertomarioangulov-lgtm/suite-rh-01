import { PayrollConcept } from '~~/server/models/PayrollConcept'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import {
  mongoIdSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'

/** Elimina un concepto de nómina (no afecta nóminas ya liquidadas). */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])

  const tenantId = await getTenantId(event)
  const id = validateWithSchema(
    mongoIdSchema,
    getRouterParam(event, 'id') || '',
  )
  const result = await PayrollConcept.deleteOne({ _id: id, tenantId })
  if (!result.deletedCount) {
    throw createError({ statusCode: 404, message: 'Concepto no encontrado' })
  }
  return { success: true }
})
