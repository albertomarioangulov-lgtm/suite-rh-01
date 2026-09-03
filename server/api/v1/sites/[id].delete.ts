import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import { mongoIdSchema, validateWithSchema } from '~~/server/utils/validation-schemas'
import { deleteSite } from '~~/server/services/site.service'

/** Elimina una sede. Solo admin (o superadmin). */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN])
  const tenantId = await getTenantId(event)
  const id = validateWithSchema(mongoIdSchema, getRouterParam(event, 'id') || '')
  if (!tenantId) {
    throw createError({ statusCode: 409, message: 'Sin empresa activa.' })
  }
  return deleteSite(tenantId, id)
})
