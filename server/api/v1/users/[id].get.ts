import { User } from '~~/server/models/User'
import { isAdminOrManager, requireAuth } from '~~/server/utils/authorize'
import { mongoIdSchema, validateWithSchema } from '~~/server/utils/validation-schemas'

export default defineEventHandler(async (event) => {
  const payload = await requireAuth(event)

  const id = validateWithSchema(mongoIdSchema, getRouterParam(event, 'id') || '')

  const manager = await isAdminOrManager(event)
  if (!manager && payload.userId !== id) {
    throw createError({
      statusCode: 403,
      message: 'No tienes permisos para realizar esta acción.',
    })
  }

  const user = await User.findById(id)
  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'Usuario no encontrado',
    })
  }

  return user.toJSON()
})
