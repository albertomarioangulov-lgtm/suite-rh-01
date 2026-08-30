import { API_PATHS } from '~/utils/api-paths'

export type ShiftType = 'fixed' | 'rotating'

export interface IShiftDay {
  dayOfWeek: number
  ranges: Array<{ startTime: string; endTime: string }>
  workHours?: number
  active?: boolean
}

export interface IShiftView {
  _id: string
  tenantId: string
  name: string
  type: ShiftType
  days: IShiftDay[]
  description?: string
  color: string
  active: boolean
  createdAt?: string
  updatedAt?: string
}

export interface IShiftPayload {
  name?: string
  type?: ShiftType
  days?: IShiftDay[]
  description?: string
  color?: string
  active?: boolean
}

/**
 * Estado global del módulo de turnos (useState, sin Pinia).
 */
export const useShiftState = () => {
  const { authFetch } = useAuthState()

  const shifts = useState<IShiftView[]>('shift-list', () => [])
  const total = useState<number>('shift-total', () => 0)
  const currentShift = useState<IShiftView | null>('shift-current', () => null)
  const employeesByShift = useState<Array<Record<string, any>>>(
    'shift-employees',
    () => [],
  )
  const shiftHistory = useState<Array<Record<string, any>>>(
    'shift-history',
    () => [],
  )
  const loading = useState<boolean>('shift-loading', () => false)
  const error = useState<string>('shift-error', () => '')

  const setError = (err: unknown, fallback: string) => {
    const apiError = err as
      | { data?: { message?: string }; message?: string }
      | null
    error.value = apiError?.data?.message || apiError?.message || fallback
  }

  const fetchShifts = async (query: Record<string, unknown> = {}) => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<{ items: IShiftView[]; total: number }>(
        API_PATHS.shifts.list,
        { query },
      )
      shifts.value = data.items
      total.value = data.total
    } catch (err) {
      setError(err, 'Error al cargar turnos')
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchShiftById = async (id: string) => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<IShiftView>(API_PATHS.shifts.detail(id))
      currentShift.value = data
      return data
    } catch (err) {
      setError(err, 'Error al cargar el turno')
      throw err
    } finally {
      loading.value = false
    }
  }

  const createShift = async (payload: IShiftPayload) => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<IShiftView>(API_PATHS.shifts.list, {
        method: 'POST',
        body: payload,
      })
      return data
    } catch (err) {
      setError(err, 'Error al crear el turno')
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateShift = async (id: string, payload: IShiftPayload) => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<IShiftView>(API_PATHS.shifts.detail(id), {
        method: 'PUT',
        body: payload,
      })
      currentShift.value = data
      return data
    } catch (err) {
      setError(err, 'Error al actualizar el turno')
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteShift = async (id: string) => {
    loading.value = true
    error.value = ''
    try {
      await authFetch(API_PATHS.shifts.detail(id), { method: 'DELETE' })
    } catch (err) {
      setError(err, 'Error al eliminar el turno')
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchEmployeesByShift = async (id: string) => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<{ items: Array<Record<string, any>> }>(
        API_PATHS.shifts.employees(id),
        { query: { limit: 100, page: 1 } },
      )
      employeesByShift.value = data.items
    } catch (err) {
      setError(err, 'Error al cargar empleados del turno')
      throw err
    } finally {
      loading.value = false
    }
  }

  const assignShift = async (id: string, employeeIds: string[]) => {
    loading.value = true
    error.value = ''
    try {
      await authFetch(API_PATHS.shifts.assign(id), {
        method: 'POST',
        body: { employeeIds },
      })
    } catch (err) {
      setError(err, 'Error al asignar el turno')
      throw err
    } finally {
      loading.value = false
    }
  }

  const unassignShift = async (id: string, employeeIds: string[]) => {
    loading.value = true
    error.value = ''
    try {
      await authFetch(API_PATHS.shifts.unassign(id), {
        method: 'POST',
        body: { employeeIds },
      })
    } catch (err) {
      setError(err, 'Error al desasignar el turno')
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchShiftHistory = async (id: string) => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<Array<Record<string, any>>>(
        API_PATHS.shifts.history(id),
      )
      shiftHistory.value = data
    } catch (err) {
      setError(err, 'Error al cargar el historial')
      throw err
    } finally {
      loading.value = false
    }
  }

  const clearCurrentShift = () => {
    currentShift.value = null
    employeesByShift.value = []
    shiftHistory.value = []
  }

  return {
    shifts,
    total,
    currentShift,
    employeesByShift,
    shiftHistory,
    loading,
    error,
    fetchShifts,
    fetchShiftById,
    createShift,
    updateShift,
    deleteShift,
    fetchEmployeesByShift,
    assignShift,
    unassignShift,
    fetchShiftHistory,
    clearCurrentShift,
  }
}

export default useShiftState
