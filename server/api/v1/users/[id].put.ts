import { User } from '~~/server/models/User'
import { isAdmin, requireAuth } from '~~/server/utils/authorize'
import {
  mongoIdSchema,
  userUpdateSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'

export default defineEventHandler(async (event) => {
  const authPayload = await requireAuth(event)

  const id = validateWithSchema(mongoIdSchema, getRouterParam(event, 'id') || '')

  const body = await readBody(event)
  const data = validateWithSchema(userUpdateSchema, body)

  const isAdminUser = await isAdmin(event)
  const isSelf = authPayload.userId === id
  if (!isAdminUser && !isSelf) {
    throw createError({
      statusCode: 403,
      message: 'No tienes permisos para realizar esta acción.',
    })
  }

  // Un usuario puede editar su perfil, pero no escalar rol ni auto-desactivarse.
  if (!isAdminUser && (data.role !== undefined || data.active !== undefined)) {
    throw createError({
      statusCode: 403,
      message: 'No tienes permisos para cambiar rol o estado.',
    })
  }

  const user = await User.findById(id)
  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'Usuario no encontrado',
    })
  }

  if (data.email && data.email !== user.email) {
    const existingUser = await User.findOne({ email: data.email })
    if (existingUser && existingUser._id.toString() !== id) {
      throw createError({
        statusCode: 409,
        message: 'El correo ya está registrado',
      })
    }
  }

  if (authPayload.userId === id && data.active === false) {
    throw createError({
      statusCode: 400,
      message: 'No puedes desactivar tu propia cuenta',
    })
  }

  if (data.name !== undefined) user.name = data.name
  if (data.email !== undefined) user.email = data.email
  if (data.password !== undefined) user.password = data.password
  if (data.role !== undefined) user.role = data.role
  if (data.active !== undefined) user.active = data.active

  await user.save()

  return user.toJSON()
})
