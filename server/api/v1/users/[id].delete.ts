import { User } from '~~/server/models/User'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { mongoIdSchema, validateWithSchema } from '~~/server/utils/validation-schemas'

export default defineEventHandler(async (event) => {
  const authPayload = await authorize(event, [ROLES.ADMIN])

  const id = validateWithSchema(mongoIdSchema, getRouterParam(event, 'id') || '')

  if (authPayload.userId === id) {
    throw createError({
      statusCode: 400,
      message: 'No puedes eliminar tu propia cuenta',
    })
  }

  // Soft delete: se desactiva y se revoca la sesión, conservando el registro.
  const user = await User.findById(id)
  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'Usuario no encontrado',
    })
  }

  user.active = false
  await user.save()

  return { success: true }
})
