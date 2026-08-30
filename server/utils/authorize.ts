import type { H3Event } from 'h3'
import { ROLES, type UserRole } from '~~/shared/auth'
import { User } from '~~/server/models/User'

export interface AuthSessionPayload {
  userId: string
}

/**
 * Requiere una sesión de usuario válida (cookie sellada de nuxt-auth-utils).
 * Devuelve el userId para mantener compatibilidad con los endpoints.
 */
export const requireAuth = async (event: H3Event): Promise<AuthSessionPayload> => {
  const session = await requireUserSession(event)
  const userId = String((session.user as { _id?: string } | undefined)?._id || '')

  if (!userId) {
    throw createError({
      statusCode: 401,
      message: 'No autorizado.',
    })
  }

  return { userId }
}

/**
 * Valida role y active contra la base de datos (no confía en la sesión),
 * de modo que los cambios de role/active surtan efecto de inmediato.
 */
const checkRoles = async (
  event: H3Event,
  allowedRoles: UserRole[],
): Promise<AuthSessionPayload> => {
  const { userId } = await requireAuth(event)

  const user = await User.findById(userId).select('role active').lean()
  if (!user || !user.active || !allowedRoles.includes(user.role as UserRole)) {
    throw createError({
      statusCode: 403,
      message: 'No tienes permisos para realizar esta acción.',
    })
  }

  return { userId }
}

/**
 * Alias principal: autoriza un endpoint requiriendo uno de los roles indicados.
 * Lanza 401 sin sesión y 403 si el role no está permitido.
 */
export const authorize = async (
  event: H3Event,
  allowedRoles: UserRole[],
): Promise<AuthSessionPayload> => checkRoles(event, allowedRoles)

/** Verifica si el usuario autenticado es administrador (sin lanzar error). */
export const isAdmin = async (event: H3Event): Promise<boolean> => {
  try {
    const { userId } = await requireAuth(event)
    const user = await User.findById(userId).select('role active').lean()
    return !!user && user.active && user.role === ROLES.ADMIN
  } catch {
    return false
  }
}

/** Verifica si el usuario autenticado es administrador o manager (sin lanzar error). */
export const isAdminOrManager = async (event: H3Event): Promise<boolean> => {
  try {
    const { userId } = await requireAuth(event)
    const user = await User.findById(userId).select('role active').lean()
    return (
      !!user &&
      user.active &&
      ([ROLES.ADMIN, ROLES.MANAGER] as UserRole[]).includes(user.role as UserRole)
    )
  } catch {
    return false
  }
}
