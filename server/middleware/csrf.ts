/**
 * Protección CSRF para mutaciones: si la petición viene de un navegador
 * (trae header Origin), el origen debe coincidir con el host del servidor.
 * Clientes no-navegador (sin Origin) siguen permitidos.
 */
export default defineEventHandler((event) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(event.method)) return

  const origin = getRequestHeader(event, 'origin')
  if (!origin) return

  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    throw createError({
      statusCode: 403,
      message: 'Origen no permitido.',
    })
  }

  // Detrás de proxies (hosted.app, Cloudflare…) el header Host puede ser
  // interno: se prefiere x-forwarded-host cuando el proxy lo expone.
  const forwardedHost = getRequestHeader(event, 'x-forwarded-host')
  const host =
    forwardedHost?.split(',')[0]?.trim() ||
    getRequestHeader(event, 'host') ||
    ''
  if (host && originHost === host) return

  // Respaldo: allowlist explícita (CORS_ORIGINS) para despliegues donde el
  // proxy no expone x-forwarded-host.
  const config = useRuntimeConfig(event)
  const allowedHosts = String(config.corsOrigins || '')
    .split(',')
    .map((entry) => {
      try {
        return new URL(entry.trim()).host
      } catch {
        return ''
      }
    })
    .filter(Boolean)
  if (allowedHosts.includes(originHost)) return

  throw createError({
    statusCode: 403,
    message: 'Origen no permitido.',
  })
})
