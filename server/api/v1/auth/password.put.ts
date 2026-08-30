import { User } from '~~/server/models/User'
import { requireAuth } from '~~/server/utils/authorize'
import { changePasswordSchema, validateWithSchema } from '~~/server/utils/validation-schemas'

export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event)

  const body = await readBody(event)
  const data = validateWithSchema(changePasswordSchema, body)

  const user = await User.findById(userId)
  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'Usuario no encontrado',
    })
  }

  const isValid = await user.comparePassword(data.currentPassword)
  if (!isValid) {
    throw createError({
      statusCode: 400,
      message: 'La contraseña actual no es correcta',
    })
  }

  user.password = data.newPassword
  await user.save()

  return { success: true }
})
