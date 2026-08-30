import { User } from '~~/server/models/User'
import { requireAuth } from '~~/server/utils/authorize'
import { syncUserTenants } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event)

  // Multi-tenant: sincroniza la lista de empresas del usuario (empleados).
  await syncUserTenants(userId)

  const user = await User.findById(userId)
  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'Usuario no encontrado',
    })
  }

  return user.toJSON()
})
