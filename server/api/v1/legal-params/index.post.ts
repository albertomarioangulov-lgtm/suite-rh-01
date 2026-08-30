import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { logAudit } from '~~/server/utils/audit'
import { legalParamsSchema, validateWithSchema } from '~~/server/utils/validation-schemas'
import { createLegalParams } from '~~/server/services/company.service'

/** Crea un nuevo período de parámetros (no sobrescribe el vigente). Solo admin. */
export default defineEventHandler(async (event) => {
  const { userId } = await authorize(event, [ROLES.ADMIN])

  const body = await readBody(event)
  const data = validateWithSchema(legalParamsSchema, body)

  const params = await createLegalParams(data)

  const session = await getUserSession(event)
  const userName = (session.user as { name?: string } | undefined)?.name
  await logAudit({
    module: 'legal-params',
    action: 'create',
    entityId: String(params._id),
    userId,
    userName,
    description: `Nuevo período de parámetros legales (vigente desde ${data.validFrom.toISOString().slice(0, 10)})`,
  })

  return params
})
