import { User } from '~~/server/models/User'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { sendInviteEmail } from '~~/server/utils/brevo'
import { logEmailEvent } from '~~/server/utils/email-log'
import { generateInviteToken } from '~~/server/utils/invite'
import { mongoIdSchema, validateWithSchema } from '~~/server/utils/validation-schemas'

/** Reenvía el correo de invitación a un usuario existente (admin). */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN])

  const id = validateWithSchema(mongoIdSchema, getRouterParam(event, 'id') || '')
  const user = await User.findById(id)
  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'Usuario no encontrado',
    })
  }

  const { token, hash, expiresAt } = generateInviteToken()
  user.inviteTokenHash = hash
  user.inviteTokenExpiresAt = expiresAt
  user.emailStatus = 'pending'
  await user.save()

  const appUrl = String(useRuntimeConfig(event).appUrl || 'http://localhost:3000')
  const inviteUrl = `${appUrl}/auth/invite?token=${token}`
  try {
    const messageId = await sendInviteEmail({
      email: user.email,
      name: user.name,
      inviteUrl,
    })
    await logEmailEvent({
      email: user.email,
      status: 'pending',
      eventName: 'sent',
      messageId,
      eventAt: new Date(),
    })
    return { success: true, inviteSent: true }
  } catch (error) {
    console.error('No se pudo reenviar la invitación:', error)
    await logEmailEvent({
      email: user.email,
      status: 'failed',
      eventName: 'send_error',
      eventAt: new Date(),
    })
    return { success: true, inviteSent: false }
  }
})
