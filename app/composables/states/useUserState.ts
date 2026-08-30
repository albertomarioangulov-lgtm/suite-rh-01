import type { AuthUser } from '~~/shared/auth'
import { API_PATHS } from '~/utils/api-paths'

export interface IUserListResponse {
  items: AuthUser[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface IUserQuery {
  page?: number
  limit?: number
  search?: string
  role?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface IUserPayload {
  name: string
  email: string
  password?: string
  role?: string
  active?: boolean
  invite?: boolean
  employee?: {
    firstName: string
    lastName: string
    document: string
    position: string
    baseSalary: number
    contractType?: string
    hireDate?: string
  }
}

export interface IUserPagination {
  page: number
  itemsPerPage: number
  totalPages: number
}

export interface IUserFilters {
  search: string
  role?: string
}

/**
 * Estado global del CRUD de usuarios (useState, sin Pinia).
 * Todas las llamadas pasan por `authFetch` (renovación automática de sesión).
 */
export const useUserState = () => {
  const { authFetch } = useAuthState()

  const users = useState<AuthUser[]>('usr-items', () => [])
  const total = useState<number>('usr-total', () => 0)
  const loading = useState<boolean>('usr-loading', () => false)
  const currentUser = useState<AuthUser | null>('usr-current', () => null)
  const error = useState<string>('usr-error', () => '')
  const pagination = useState<IUserPagination>('usr-pagination', () => ({
    page: 1,
    itemsPerPage: 10,
    totalPages: 1,
  }))
  const filters = useState<IUserFilters>('usr-filters', () => ({
    search: '',
    role: undefined,
  }))

  const setError = (err: unknown, fallback: string) => {
    const apiError = err as { data?: { message?: string }; message?: string } | null
    error.value = apiError?.data?.message || apiError?.message || fallback
  }

  const fetchUsers = async (query: IUserQuery = {}): Promise<IUserListResponse> => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<IUserListResponse>(API_PATHS.users.list, {
        query: query as Record<string, unknown>,
      })
      users.value = data.items
      total.value = data.total
      pagination.value = {
        page: data.page,
        itemsPerPage: data.limit,
        totalPages: data.totalPages,
      }
      return data
    } catch (err: unknown) {
      setError(err, 'Error al cargar usuarios')
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchUserById = async (id: string): Promise<AuthUser> => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<AuthUser>(API_PATHS.users.detail(id))
      currentUser.value = data
      return data
    } catch (err: unknown) {
      setError(err, 'Error al cargar el usuario')
      throw err
    } finally {
      loading.value = false
    }
  }

  const createUser = async (payload: IUserPayload): Promise<AuthUser> => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<AuthUser>(API_PATHS.users.list, {
        method: 'POST',
        body: payload,
      })
      return data
    } catch (err: unknown) {
      setError(err, 'Error al crear el usuario')
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateUser = async (id: string, payload: IUserPayload): Promise<AuthUser> => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<AuthUser>(API_PATHS.users.detail(id), {
        method: 'PUT',
        body: payload,
      })
      currentUser.value = data
      return data
    } catch (err: unknown) {
      setError(err, 'Error al actualizar el usuario')
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteUser = async (id: string): Promise<void> => {
    loading.value = true
    error.value = ''
    try {
      await authFetch(API_PATHS.users.detail(id), {
        method: 'DELETE',
      })
    } catch (err: unknown) {
      setError(err, 'Error al eliminar el usuario')
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    users,
    total,
    loading,
    currentUser,
    error,
    pagination,
    filters,
    fetchUsers,
    fetchUserById,
    createUser,
    updateUser,
    deleteUser,
  }
}

export default useUserState
