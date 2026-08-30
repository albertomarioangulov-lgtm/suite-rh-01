/**
 * Sesión deslizante: extiende la expiración de la cookie mientras haya
 * actividad, como máximo una vez por hora para no reescribir la cookie
 * en cada petición.
 */
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event).catch(() => null)
  if (!session?.user) return

  const now = Date.now()
  const lastSeenAt = typeof session.lastSeenAt === 'number' ? session.lastSeenAt : 0
  if (now - lastSeenAt > 60 * 60 * 1000) {
    await setUserSession(event, { lastSeenAt: now })
  }
})
