import { User } from '~~/server/models/User'
import { EmailLog } from '~~/server/models/EmailLog'
import { mapBrevoEventToStatus, parseBrevoDate, verifyBrevoWebhook } from '~~/server/utils/brevo'

interface BrevoWebhookEvent {
  event?: string
  email?: string
  date?: unknown
  'message-id'?: string
  message_id?: string
  [key: string]: unknown
}

const MAX_HISTORY = 100

/**
 * Webhook de Brevo: hace upsert del documento (email, type) y agrega cada
 * evento al historial con su fecha y payload crudo. Solo los eventos
 * conocidos actualizan latestStatus y el estado del usuario.
 *
 * Configura en Brevo la URL:
 * https://<dominio>/api/v1/emails/webhook?secret=<BREVO_WEBHOOK_SECRET>
 */
export default defineEventHandler(async (event) => {
  if (!verifyBrevoWebhook(event)) {
    throw createError({
      statusCode: 401,
      message: 'Webhook no autorizado.',
    })
  }

  const body = await readBody(event)
  const events: BrevoWebhookEvent[] = Array.isArray(body) ? body : [body]

  let processed = 0

  for (const item of events) {
    const email = item.email
    const eventName = item.event
    if (!email || !eventName) continue

    const mapped = mapBrevoEventToStatus(eventName)
    const status = mapped ?? 'unknown'
    const eventAt = parseBrevoDate(item.date) ?? new Date()
    const messageId = String(item['message-id'] || item.message_id || '')

    const update: Record<string, unknown> = {
      $push: {
        history: {
          $each: [
            {
              status,
              eventName,
              messageId,
              eventAt,
              raw: item,
            },
          ],
          $slice: -MAX_HISTORY,
        },
      },
      $set: {
        lastEventAt: eventAt,
      },
      $setOnInsert: {
        email,
        type: 'invite',
      },
    }

    if (mapped) {
      ;(update.$set as Record<string, unknown>).latestStatus = mapped
      await User.updateOne({ email }, { emailStatus: mapped, emailStatusUpdatedAt: new Date() })
    }

    await EmailLog.updateOne(
      { email, type: 'invite' },
      update as Parameters<typeof EmailLog.updateOne>[1],
      { upsert: true },
    )
    processed++
  }

  return { success: true, processed }
})
