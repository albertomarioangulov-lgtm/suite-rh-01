/**
 * Tipos de la sesión de nuxt-auth-utils.
 *
 * En la sesión solo se guarda lo esencial para reconocer al usuario;
 * la autorización sensible siempre se valida contra la BD en `authorize`.
 */
import type { UserRole } from './shared/auth'

declare module '#auth-utils' {
  interface User {
    _id: string
    email: string
    name: string
    role: UserRole
    active: boolean
  }

  interface UserSession {
    loggedInAt?: number
    lastSeenAt?: number
  }
}

export {}
