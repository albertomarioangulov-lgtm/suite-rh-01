import { ROLES, type AuthUser, type UserRole } from '~~/shared/auth'
import { API_PATHS } from '~/utils/api-paths'

interface IAuthFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'
  query?: Record<string, unknown>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- passthrough de ofetch
  body?: Record<string, any> | string | null
  headers?: Record<string, string>
}

/**
 * Estado global de autenticación sobre nuxt-auth-utils.
 *
 * - Sesión sellada en cookie httpOnly (server-side); el cliente solo ve
 *   `user` a través de useUserSession().
 * - `authFetch` es un $fetch con reintento: si responde 401, refresca la
 *   sesión desde el servidor y reintenta una vez.
 */
export const useAuthState = () => {
  const session = useUserSession()

  const user = computed<AuthUser | null>(() => (session.user.value as AuthUser | null) ?? null)
  const isLoggedIn = computed(() => session.loggedIn.value)
  const isAuthenticated = computed(() => isLoggedIn.value)
  const isSuperAdmin = computed(() => user.value?.role === ROLES.SUPERADMIN)
  const isAdmin = computed(
    () =>
      !!user.value &&
      ([ROLES.ADMIN, ROLES.SUPERADMIN] as UserRole[]).includes(user.value.role),
  )
  const isAdminOrManager = computed(
    () =>
      !!user.value &&
      ([ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPERADMIN] as UserRole[]).includes(
        user.value.role,
      ),
  )

  const authFetch = async <T = unknown>(
    url: string,
    options: IAuthFetchOptions = {},
  ): Promise<T> => {
    try {
      return (await $fetch(url, options)) as T
    } catch (error) {
      const apiError = error as { statusCode?: number; status?: number } | null
      const status = apiError?.statusCode ?? apiError?.status
      if (status !== 401) throw error

      await session.fetch()
      if (!session.loggedIn.value) {
        if (import.meta.client) await navigateTo('/auth/login')
        throw error
      }
      return (await $fetch(url, options)) as T
    }
  }

  const login = async (email: string, password: string) => {
    try {
      await $fetch<AuthUser>(API_PATHS.auth.login, {
        method: 'POST',
        body: { email, password },
      })
      await session.fetch()
      return true
    } catch {
      return false
    }
  }

  const logout = async () => {
    try {
      await session.clear()
    } catch {
      // La sesión local se limpia igualmente.
    }
  }

  const fetchMe = async () => {
    await session.fetch()
    if (!session.loggedIn.value) return null
    try {
      // Hidrata el usuario desde la BD: corrige sesiones creadas antes de
      // renombramientos de campos y refleja cambios de rol/estado al instante.
      const freshUser = await authFetch<AuthUser>(API_PATHS.auth.me)
      session.value = { ...session.value, user: freshUser }
      return freshUser
    } catch {
      return null
    }
  }

  const restoreSession = async (): Promise<boolean> => {
    await fetchMe()
    return session.loggedIn.value
  }

  const hasRole = (roles: string[]) => !!user.value && roles.includes(user.value.role)

  return {
    user,
    isLoggedIn,
    isAuthenticated,
    isSuperAdmin,
    isAdmin,
    isAdminOrManager,
    hasRole,
    authFetch,
    login,
    logout,
    fetchMe,
    restoreSession,
  }
}

export default useAuthState
