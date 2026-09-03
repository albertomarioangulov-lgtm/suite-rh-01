import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import {
  validateWithSchema,
  z,
} from '~~/server/utils/validation-schemas'
import { FEATURE_FLAG_LIST, type FeatureFlag } from '~~/shared/feature-flags'
import { ModuleRequest } from '~~/server/models/ModuleRequest'
import { isFlagEnabled } from '~~/server/services/feature-flags.service'

const requestSchema = z.object({
  module: z.enum(FEATURE_FLAG_LIST as [FeatureFlag, ...FeatureFlag[]]),
  message: z.string().trim().max(500).optional().default(''),
})

/**
 * Solicita la activación de un módulo (cliente). La resuelve el superadmin.
 */
export default defineEventHandler(async (event) => {
  const { userId } = await authorize(event, [
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.HR,
  ])
  const tenantId = await getTenantId(event)
  const data = validateWithSchema(requestSchema, await readBody(event))
  if (!tenantId) {
    throw createError({
      statusCode: 409,
      message: 'Configura primero la empresa.',
    })
  }

  if (await isFlagEnabled(tenantId, data.module)) {
    throw createError({
      statusCode: 409,
      message: 'Ese módulo ya está activo para la empresa.',
    })
  }

  const request = await ModuleRequest.create({
    tenantId,
    module: data.module,
    message: data.message,
    status: 'pending',
    requestedBy: userId,
  })

  return {
    id: String(request._id),
    module: request.module,
    status: request.status,
  }
})
