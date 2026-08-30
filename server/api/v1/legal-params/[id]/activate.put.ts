import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { logAudit } from '~~/server/utils/audit'
import { mongoIdSchema, validateWithSchema } from '~~/server/utils/validation-schemas'
import { activateLegalParams } from '~~/server/services/company.service'

/** Activa un período de parámetros y desactiva el anterior. Solo admin. */
export default defineEventHandler(async (event) => {
  const { userId } = await authorize(event, [ROLES.ADMIN])

  const id = validateWithSchema(mongoIdSchema, getRouterParam(event, 'id') || '')
  const params = await activateLegalParams(id)

  const session = await getUserSession(event)
  const userName = (session.user as { name?: string } | undefined)?.name
  await logAudit({
    module: 'legal-params',
    action: 'activate',
    entityId: String(params._id),
    userId,
    userName,
    description: 'Período de parámetros legales activado',
  })

  return params
})
