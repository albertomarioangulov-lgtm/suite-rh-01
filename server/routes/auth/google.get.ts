import { User } from '~~/server/models/User'
import type { UserRole } from '~~/shared/auth'

/**
 * Login con Google (OAuth 2.0).
 *
 * Configura en tu consola de Google Cloud la URI de redirección:
 * https://<tu-dominio>/auth/google
 * y define en el entorno:
 * - NUXT_OAUTH_GOOGLE_CLIENT_ID
 * - NUXT_OAUTH_GOOGLE_CLIENT_SECRET
 *
 * Solo permite iniciar sesión a correos que ya tienen cuenta en el sistema
 * (las cuentas las crea un administrador). No crea cuentas automáticamente.
 */
export default defineOAuthGoogleEventHandler({
  config: {
    scope: ['email', 'openid', 'profile'],
  },
  async onSuccess(event, { user: googleUser }) {
    const email = googleUser.email
    if (!email) {
      console.error('Google OAuth: el correo es requerido')
      return sendRedirect(event, '/auth/login')
    }

    const dbUser = await User.findByEmail(email)
    if (!dbUser || !dbUser.active) {
      return sendRedirect(event, '/auth/login?google=no-account')
    }

    await replaceUserSession(event, {
      user: {
        _id: dbUser._id.toString(),
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role as UserRole,
        active: dbUser.active,
      },
      loggedInAt: Date.now(),
    })

    return sendRedirect(event, '/home')
  },
  onError(event, error) {
    console.error('Google OAuth error:', error)
    return sendRedirect(event, '/auth/login')
  },
})
