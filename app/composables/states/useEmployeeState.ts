import type { AuthUser } from '~~/shared/auth'
import { API_PATHS } from '~/utils/api-paths'

export interface IEmployeeView {
  _id: string
  tenantId: string
  user:
    | string
    | Pick<AuthUser, '_id' | 'name' | 'email' | 'active' | 'role'>
    | null
  document: string
  documentType: number
  firstName: string
  lastName: string
  email?: string
  hireDate?: string
  contractType: string
  employeeType: string
  subEmployeeType: string
  salarioIntegral: boolean
  bankName?: string
  accountType?: 'ahorros' | 'corriente' | null
  accountNumber?: string
  baseSalary: number
  position: string
  department?: { _id?: string; name?: string } | string | null
  manager?: { _id?: string; firstName?: string; lastName?: string } | string | null
  assignedShift?: string
  active: boolean
  terminationDate?: string | null
  terminationReason?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface IEmployeePayload {
  user?: string
  document?: string
  documentType?: number
  firstName?: string
  lastName?: string
  email?: string
  hireDate?: string
  contractType?: string
  employeeType?: string
  subEmployeeType?: string
  salarioIntegral?: boolean
  bankName?: string
  accountType?: 'ahorros' | 'corriente' | null
  accountNumber?: string
  baseSalary?: number
  position?: string
  department?: string | null
  manager?: string | null
  assignedShift?: string
  active?: boolean
}

export interface IEmployeeQuery {
  page?: number
  limit?: number
  search?: string
  active?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface IEmployeeListResponse {
  items: IEmployeeView[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Estado global del CRUD de empleados (useState, sin Pinia).
 * Mismo patrón que useUserState; adaptar la paginación si se reutiliza.
 */
export const useEmployeeState = () => {
  const { authFetch } = useAuthState()

  const employees = useState<IEmployeeView[]>('emp-list', () => [])
  const currentEmployee = useState<IEmployeeView | null>(
    'emp-current',
    () => null,
  )
  const loading = useState<boolean>('emp-loading', () => false)
  const error = useState<string>('emp-error', () => '')

  const setError = (err: unknown, fallback: string) => {
    const apiError = err as
      | { data?: { message?: string }; message?: string }
      | null
    error.value = apiError?.data?.message || apiError?.message || fallback
  }

  const fetchEmployees = async (
    query: IEmployeeQuery = {},
  ): Promise<IEmployeeListResponse> => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<IEmployeeListResponse>(
        API_PATHS.employees.list,
        { query: query as Record<string, unknown> },
      )
      employees.value = data.items
      return data
    } catch (err) {
      setError(err, 'Error al cargar empleados')
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchEmployeeById = async (id: string): Promise<IEmployeeView> => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<IEmployeeView>(
        API_PATHS.employees.detail(id),
      )
      currentEmployee.value = data
      return data
    } catch (err) {
      setError(err, 'Error al cargar el empleado')
      throw err
    } finally {
      loading.value = false
    }
  }

  const createEmployee = async (
    payload: IEmployeePayload,
  ): Promise<IEmployeeView> => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<IEmployeeView>(API_PATHS.employees.list, {
        method: 'POST',
        body: payload,
      })
      return data
    } catch (err) {
      setError(err, 'Error al crear el empleado')
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateEmployee = async (
    id: string,
    payload: IEmployeePayload,
  ): Promise<IEmployeeView> => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<IEmployeeView>(
        API_PATHS.employees.detail(id),
        { method: 'PUT', body: payload },
      )
      currentEmployee.value = data
      return data
    } catch (err) {
      setError(err, 'Error al actualizar el empleado')
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteEmployee = async (
    id: string,
    terminationReason?: string,
  ): Promise<void> => {
    loading.value = true
    error.value = ''
    try {
      await authFetch(API_PATHS.employees.detail(id), {
        method: 'DELETE',
        body: { terminationReason },
      })
    } catch (err) {
      setError(err, 'Error al eliminar el empleado')
      throw err
    } finally {
      loading.value = false
    }
  }

  const assignShift = async (
    id: string,
    assignedShift: string,
  ): Promise<IEmployeeView> => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<IEmployeeView>(
        API_PATHS.employees.assignShift(id),
        { method: 'PUT', body: { assignedShift } },
      )
      currentEmployee.value = data
      return data
    } catch (err) {
      setError(err, 'Error al asignar el turno')
      throw err
    } finally {
      loading.value = false
    }
  }

  const resetState = () => {
    employees.value = []
    currentEmployee.value = null
    error.value = ''
    loading.value = false
  }

  return {
    employees,
    currentEmployee,
    loading,
    error,
    fetchEmployees,
    fetchEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    assignShift,
    resetState,
  }
}

export default useEmployeeState
