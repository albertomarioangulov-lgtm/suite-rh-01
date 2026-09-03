import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import {
  siteCreateSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'
import { createSite } from '~~/server/services/site.service'

/** Crea una sede. Solo admin (o superadmin). */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN])
  const tenantId = await getTenantId(event)
  if (!tenantId) {
    throw createError({
      statusCode: 409,
      message: 'Configura primero la empresa.',
    })
  }
  const data = validateWithSchema(siteCreateSchema, await readBody(event))
  const site = await createSite(tenantId, data)
  return site.toJSON()
})
