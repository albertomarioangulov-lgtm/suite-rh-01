import { Company } from '~~/server/models/Company'
import { User } from '~~/server/models/User'
import { requireAuth } from '~~/server/utils/authorize'
import { mongoIdSchema, validateWithSchema } from '~~/server/utils/validation-schemas'

/** Cambia el tenant activo del usuario (debe pertenecer a él). */
export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event)
  const body = await readBody(event)
  const data = validateWithSchema(mongoIdSchema, String(body.tenantId ?? ''))

  const user = await User.findById(userId)
  if (!user) {
    throw createError({ statusCode: 404, message: 'Usuario no encontrado' })
  }
  const tenantIds = (user.tenantIds ?? []).map(String)
  if (!tenantIds.includes(data)) {
    throw createError({
      statusCode: 403,
      message: 'No perteneces a esa empresa.',
    })
  }

  const company = await Company.findById(data)
  if (!company) {
    throw createError({ statusCode: 404, message: 'Empresa no encontrada' })
  }

  user.tenantActivo = company._id as never
  await user.save()

  const session = await getUserSession(event)
  await setUserSession(event, {
    ...session,
    user: {
      ...(session.user as Record<string, unknown>),
      tenantActivo: String(company._id),
    },
  })

  return {
    success: true,
    tenantId: String(company._id),
    tenantName: company.name,
  }
})
