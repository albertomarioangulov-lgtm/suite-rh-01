import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { logAudit } from '~~/server/utils/audit'
import { companyUpdateSchema, validateWithSchema } from '~~/server/utils/validation-schemas'
import { updateCompanyConfig } from '~~/server/services/company.service'

/** Actualiza (o crea si es la primera) la configuración de empresa. Solo admin. */
export default defineEventHandler(async (event) => {
  const { userId } = await authorize(event, [ROLES.ADMIN])

  const body = await readBody(event)
  const data = validateWithSchema(companyUpdateSchema, body)

  const { company, changes, created } = await updateCompanyConfig(data)

  const session = await getUserSession(event)
  const userName = (session.user as { name?: string } | undefined)?.name
  await logAudit({
    module: 'company',
    action: created ? 'create' : 'update',
    entityId: String(company._id),
    userId,
    userName,
    description: created
      ? 'Registro inicial de la configuración de la empresa'
      : 'Actualización de la configuración de la empresa',
    changes,
  })

  return company
})
