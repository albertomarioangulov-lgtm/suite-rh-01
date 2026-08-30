import { EmailLog } from '~~/server/models/EmailLog'

const MAX_HISTORY = 100

/**
 * Agrega un evento al historial del correo (upsert por email+type).
 * Mantiene un único documento por destinatario con historial acotado.
 */
export const logEmailEvent = async (options: {
  email: string
  type?: 'invite'
  status: string
  eventName?: string
  messageId?: string
  eventAt?: Date
  raw?: unknown
}) => {
  const type = options.type ?? 'invite'
  const eventAt = options.eventAt ?? new Date()

  await EmailLog.updateOne(
    { email: options.email, type },
    {
      $push: {
        history: {
          $each: [
            {
              status: options.status,
              eventName: options.eventName,
              messageId: options.messageId,
              eventAt,
              raw: options.raw,
            },
          ],
          $slice: -MAX_HISTORY,
        },
      },
      $set: {
        latestStatus: options.status,
        lastEventAt: eventAt,
      },
      $setOnInsert: {
        email: options.email,
        type,
      },
    },
    { upsert: true },
  )
}
