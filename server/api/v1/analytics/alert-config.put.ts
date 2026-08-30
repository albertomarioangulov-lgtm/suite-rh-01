import { AlertConfig } from '~~/server/models/AlertConfig'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import { validateWithSchema, z } from '~~/server/utils/validation-schemas'

const ruleSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  description: z.string().default(''),
  enabled: z.boolean(),
  targetRoles: z.array(z.string()),
})

const updateSchema = z.object({
  rules: z.array(ruleSchema),
  pollingIntervalSeconds: z.number().int().min(0).max(3600).optional(),
})

/** Actualiza la configuración de alertas (qué tipos y para qué roles). */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN])

  const body = await readBody(event)
  const data = validateWithSchema(updateSchema, body)

  const tenantId = await getTenantId(event)
  if (!tenantId) {
    throw createError({ statusCode: 409, message: 'Configura primero la empresa.' })
  }

  const config = await AlertConfig.getOrCreate(tenantId)
  config.rules = data.rules as never
  if (data.pollingIntervalSeconds !== undefined) {
    config.pollingIntervalSeconds = data.pollingIntervalSeconds
  }
  await config.save()
  return config.toJSON()
})
