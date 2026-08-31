import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { ContactMessage } from '~~/server/models/ContactMessage'

/**
 * Lista los mensajes del formulario de contacto. Solo administradores.
 */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN])

  const messages = await ContactMessage.find()
    .sort({ createdAt: -1 })
    .limit(200)
    .select('-ip -userAgent')
    .lean()

  return messages.map((message) => ({
    id: String(message._id),
    name: message.name,
    email: message.email,
    company: message.company,
    message: message.message,
    status: message.status,
    createdAt: message.createdAt,
  }))
})
