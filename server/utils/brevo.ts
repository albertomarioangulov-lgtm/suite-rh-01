import type { H3Event } from 'h3'
import { timingSafeEqual } from 'node:crypto'

export type BrevoEventStatus =
  'delivered' | 'opened' | 'clicked' | 'bounced' | 'blocked' | 'invalid' | 'failed' | 'pending'

/**
 * Normaliza los eventos de Brevo a nuestro estado de email.
 * https://developers.brevo.com/docs/transactional-email-tracking#webhooks
 * Devuelve null para eventos desconocidos: se registran en el historial
 * pero NO sobrescriben el estado actual del usuario.
 */
export const mapBrevoEventToStatus = (event: string): BrevoEventStatus | null => {
  switch (event) {
    case 'sent':
    case 'request':
    case 'deferred':
      return 'pending'
    case 'delivered':
      return 'delivered'
    case 'opened':
    case 'uniqueOpened':
    case 'proxy_open':
      return 'opened'
    case 'click':
      return 'clicked'
    case 'hardBounce':
    case 'softBounce':
    case 'hard_bounce':
    case 'soft_bounce':
      return 'bounced'
    case 'blocked':
    case 'spam':
    case 'unsubscribed':
      return 'blocked'
    case 'invalid':
      return 'invalid'
    case 'error':
    case 'failed':
      return 'failed'
    default:
      return null
  }
}

/**
 * Convierte la fecha que envía Brevo (timestamp Unix en segundos o string
 * "YYYY-MM-DD HH:mm:ss") a Date. Devuelve undefined si no es parseable.
 */
export const parseBrevoDate = (value: unknown): Date | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value * 1000)
  }
  if (typeof value === 'string' && value.trim()) {
    const date = new Date(value.trim().replace(' ', 'T'))
    return Number.isNaN(date.getTime()) ? undefined : date
  }
  return undefined
}

/**
 * Envía un email transaccional por la API v3 de Brevo.
 * Devuelve el messageId asignado por Brevo.
 */
export const sendTransactionalEmail = async (options: {
  to: string
  subject: string
  htmlContent: string
}): Promise<string> => {
  const config = useRuntimeConfig()
  if (!config.brevoApiKey || !config.brevoSenderEmail) {
    throw createError({
      statusCode: 500,
      message: 'Brevo no está configurado (BREVO_API_KEY / BREVO_SENDER_EMAIL).',
    })
  }

  const response = await $fetch<{ messageId?: string }>('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': config.brevoApiKey,
      'content-type': 'application/json',
    },
    body: {
      sender: { email: config.brevoSenderEmail },
      to: [{ email: options.to }],
      subject: options.subject,
      htmlContent: options.htmlContent,
    },
  })

  return response.messageId || ''
}

/** Envía el correo de invitación con el enlace para crear la contraseña. */
export const sendInviteEmail = async (options: {
  email: string
  name: string
  inviteUrl: string
}): Promise<string> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1F2937;">
      <h2 style="color: #1867C0; margin-bottom: 8px;">Sistema de Nómina</h2>
      <p>Hola <strong>${options.name}</strong>,</p>
      <p>Te han creado una cuenta en el sistema de nómina. Para activarla, crea tu contraseña en el siguiente enlace:</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${options.inviteUrl}" style="background-color: #1867C0; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
          Crear mi contraseña
        </a>
      </p>
      <p>El enlace es válido por 72 horas. Si no esperabas esta invitación, ignora este correo.</p>
      <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
      <p style="color: #6B7280; font-size: 12px;">Este es un mensaje automático, por favor no respondas a este correo.</p>
    </div>
  `

  return sendTransactionalEmail({
    to: options.email,
    subject: 'Te han invitado a Sistema de Nómina',
    htmlContent: html,
  })
}

/**
 * Verifica el secreto del webhook de Brevo (enviado como query param).
 * Comparación en tiempo constante para evitar timing attacks.
 */
export const verifyBrevoWebhook = (event: H3Event): boolean => {
  const secret = String(getQuery(event).secret || '')
  const expected = String(useRuntimeConfig(event).brevoWebhookSecret || '')
  if (!secret || !expected || secret.length !== expected.length) return false
  return timingSafeEqual(new TextEncoder().encode(secret), new TextEncoder().encode(expected))
}
