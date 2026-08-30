import { User } from '~~/server/models/User'
import type { UserRole } from '~~/shared/auth'
import { loginSchema, validateWithSchema } from '~~/server/utils/validation-schemas'
import { rateLimit } from '~~/server/utils/rate-limit'
import { isHttpError } from '~~/server/utils/http-error'
import { syncUserTenants } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  try {
    rateLimit(event, { keyPrefix: 'login', max: 5, windowMs: 15 * 60 * 1000 })

    const body = await readBody(event)
    const { email, password } = validateWithSchema(loginSchema, body)

    const user = await User.findByEmail(email)
    if (!user || !user.active) {
      throw createError({
        statusCode: 401,
        message: 'Email o contraseña incorrectos',
      })
    }

    const isValidPassword = await user.comparePassword(password)
    if (!isValidPassword) {
      throw createError({
        statusCode: 401,
        message: 'Email o contraseña incorrectos',
      })
    }

    // Multi-tenant: sincroniza la lista de empresas del usuario al iniciar sesión.
    await syncUserTenants(String(user._id))

    // Sesión nueva con replace (protección contra fijación de sesión).
    await replaceUserSession(event, {
      user: {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
        active: user.active,
        tenantIds: user.tenantIds?.map(String) ?? [],
        tenantActivo: user.tenantActivo ? String(user.tenantActivo) : null,
      },
      loggedInAt: Date.now(),
    })

    return user.toJSON()
  } catch (error) {
    if (isHttpError(error)) throw error
    console.error('Login error:', error)
    throw createError({
      statusCode: 500,
      message: 'Error interno del servidor. Intenta de nuevo más tarde.',
    })
  }
})
