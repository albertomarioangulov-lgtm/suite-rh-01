import { User } from '~~/server/models/User'
import type { UserRole } from '~~/shared/auth'
import { isHttpError } from '~~/server/utils/http-error'
import { hashInviteToken } from '~~/server/utils/invite'
import { rateLimit } from '~~/server/utils/rate-limit'
import { inviteSchema, validateWithSchema } from '~~/server/utils/validation-schemas'

/** Acepta una invitación: define la contraseña, activa la cuenta y crea sesión. */
export default defineEventHandler(async (event) => {
  try {
    rateLimit(event, { keyPrefix: 'invite', max: 5, windowMs: 60 * 60 * 1000 })

    const body = await readBody(event)
    const { token, password } = validateWithSchema(inviteSchema, body)

    const user = await User.findOne({ inviteTokenHash: hashInviteToken(token) })
    if (!user || !user.inviteTokenExpiresAt || user.inviteTokenExpiresAt.getTime() < Date.now()) {
      throw createError({
        statusCode: 400,
        message: 'La invitación no es válida o expiró. Solicita una nueva a un administrador.',
      })
    }

    user.password = password
    user.active = true
    await user.save()
    // Token de un solo uso: se elimina tras aceptar la invitación.
    await User.updateOne(
      { _id: user._id },
      { $unset: { inviteTokenHash: 1, inviteTokenExpiresAt: 1 } },
    )

    await replaceUserSession(event, {
      user: {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
        active: user.active,
      },
      loggedInAt: Date.now(),
    })

    return user.toJSON()
  } catch (error) {
    if (isHttpError(error)) throw error
    console.error('Invite error:', error)
    throw createError({
      statusCode: 500,
      message: 'Error interno del servidor. Intenta de nuevo más tarde.',
    })
  }
})
