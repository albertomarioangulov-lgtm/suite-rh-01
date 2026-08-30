/**
 * CORS restrictivo para /api/**.
 *
 * Solo se permite el origen (o los orígenes) listados en la variable de
 * entorno CORS_ORIGINS (separados por coma). Si no hay CORS_ORIGINS,
 * no se permiten orígenes cruzados: las llamadas same-origin de la propia
 * app (frontend en el mismo dominio) siguen funcionando sin cabeceras CORS.
 */
export default defineEventHandler((event) => {
  const { pathname } = getRequestURL(event)
  if (!pathname.startsWith('/api/')) return

  const config = useRuntimeConfig(event)
  const origins = String(config.corsOrigins || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  const didHandle = handleCors(event, {
    origin: origins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    preflight: { statusCode: 204 },
  })

  // El preflight ya fue respondido (204) por handleCors.
  if (didHandle) return null
})
