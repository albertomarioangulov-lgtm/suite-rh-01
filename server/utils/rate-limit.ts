import type { H3Event } from 'h3'

interface RateBucket {
  count: number
  resetAt: number
}

// Limitador simple en memoria (por IP). Para múltiples instancias en
// producción, reemplazar por Redis/KV compartido.
const buckets = new Map<string, RateBucket>()

export const rateLimit = (
  event: H3Event,
  options: { max?: number; windowMs?: number; keyPrefix?: string } = {},
) => {
  const { max = 5, windowMs = 15 * 60 * 1000, keyPrefix = 'rl' } = options
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const key = `${keyPrefix}:${ip}`
  const now = Date.now()

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  bucket.count++
  if (bucket.count > max) {
    throw createError({
      statusCode: 429,
      message: 'Demasiados intentos. Intenta de nuevo más tarde.',
    })
  }
}
