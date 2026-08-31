import { ContactMessage } from '~~/server/models/ContactMessage'
import { validateWithSchema, z } from '~~/server/utils/validation-schemas'
import { rateLimit } from '~~/server/utils/rate-limit'

/**
 * Formulario público de contacto (landing).
 *
 * Seguridad:
 * - Validación estricta en servidor (Zod): longitudes y formato de correo.
 * - Rate limit por IP (3 mensajes/hora).
 * - Honeypot "website": los bots lo rellenan; si llega con valor se descarta
 *   en silencio (respuesta 200 sin guardar).
 * - El mensaje se almacena como texto plano y nunca se renderiza como HTML.
 */
const contactSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  email: z.string().trim().email('Correo electrónico inválido').max(120),
  company: z.string().trim().max(120).optional().default(''),
  message: z
    .string()
    .trim()
    .min(10, 'El mensaje debe tener al menos 10 caracteres')
    .max(2000),
  // Honeypot: campo oculto que los humanos no ven ni llenan.
  website: z.string().max(100).optional().default(''),
})

export default defineEventHandler(async (event) => {
  rateLimit(event, { keyPrefix: 'contact', max: 3, windowMs: 60 * 60 * 1000 })

  const body = await readBody(event).catch(() => ({}))
  const data = validateWithSchema(contactSchema, body ?? {})

  // Honeypot detectado: responde éxito sin guardar nada.
  if (data.website.trim() !== '') {
    return { ok: true }
  }

  await ContactMessage.create({
    name: data.name,
    email: data.email,
    company: data.company,
    message: data.message,
    ip: getRequestIP(event, { xForwardedFor: true }) || '',
    userAgent: getRequestHeader(event, 'user-agent')?.slice(0, 300) ?? '',
  })

  return { ok: true }
})
