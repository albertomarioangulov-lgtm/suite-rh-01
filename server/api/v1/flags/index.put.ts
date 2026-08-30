import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import { setFlagEnabled } from '~~/server/services/feature-flags.service'
import { FEATURE_FLAG_LIST, type FeatureFlag } from '~~/shared/feature-flags'
import { validateWithSchema, z } from '~~/server/utils/validation-schemas'

const flagUpdateSchema = z.object({
  flag: z.enum(FEATURE_FLAG_LIST as [FeatureFlag, ...FeatureFlag[]]),
  enabled: z.boolean(),
})

/** Activa/desactiva un módulo del tenant (admin). */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN])

  const tenantId = await getTenantId(event)
  if (!tenantId) {
    throw createError({ statusCode: 409, message: 'Sin empresa activa.' })
  }

  const body = await readBody(event)
  const data = validateWithSchema(flagUpdateSchema, body)
  return setFlagEnabled(tenantId, data.flag, data.enabled)
})
