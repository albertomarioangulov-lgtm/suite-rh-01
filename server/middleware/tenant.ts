import { getUserTenant } from '~~/server/utils/tenant'

/**
 * Middleware de tenant: inyecta en el contexto de la petición el tenant
 * activo del usuario (si tiene sesión) para que las rutas filtren por él.
 */
export default defineEventHandler(async (event) => {
  try {
    const session = await getUserSession(event).catch(() => null)
    const userId = String(
      (session?.user as { _id?: string } | undefined)?._id ?? '',
    )
    if (!userId) return

    const tenantId = await getUserTenant(userId)
    if (tenantId) {
      event.context.tenantId = tenantId
    }
  } catch {
    // Sin sesión o sin tenant: las rutas usan el fallback de empresa global.
  }
})
