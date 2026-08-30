/**
 * Protección CSRF para mutaciones: si la petición viene de un navegador
 * (trae header Origin), el origen debe coincidir con el host del servidor.
 * Clientes no-navegador (sin Origin) siguen permitidos.
 */
export default defineEventHandler((event) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(event.method)) return

  const origin = getRequestHeader(event, 'origin')
  if (!origin) return

  const host = getRequestHeader(event, 'host')
  if (!host) return

  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    throw createError({
      statusCode: 403,
      message: 'Origen no permitido.',
    })
  }

  if (originHost !== host) {
    throw createError({
      statusCode: 403,
      message: 'Origen no permitido.',
    })
  }
})
