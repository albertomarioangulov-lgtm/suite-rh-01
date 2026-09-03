import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import {
  mongoIdSchema,
  siteUpdateSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'
import { updateSite } from '~~/server/services/site.service'

/** Actualiza una sede. Solo admin (o superadmin). */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN])
  const tenantId = await getTenantId(event)
  const id = validateWithSchema(mongoIdSchema, getRouterParam(event, 'id') || '')
  const data = validateWithSchema(siteUpdateSchema, await readBody(event))
  if (!tenantId) {
    throw createError({ statusCode: 409, message: 'Sin empresa activa.' })
  }
  return updateSite(tenantId, id, data)
})
