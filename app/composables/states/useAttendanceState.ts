import { API_PATHS } from '~/utils/api-paths'

export type AttendanceStatus = 'pending' | 'approved' | 'rejected'

export interface IAttendanceRecord {
  _id: string
  employee:
    | string
    | { _id: string; firstName: string; lastName: string; document: string }
  tenantId: string
  date?: string
  clockIn?: string
  clockOut?: string
  hoursWorked: number
  dayHours: number
  nightHours: number
  overtimeDayHours: number
  overtimeNightHours: number
  nightSurcharge: number
  isLate?: boolean
  lateMinutes?: number
  status: AttendanceStatus
  observations?: string
  createdAt?: string
  updatedAt?: string
}

export interface IAttendancePayload {
  employeeId?: string
  clockIn?: string
  clockOut?: string
  observations?: string
}

export interface IAttendanceSummary {
  days: number
  hoursWorked: number
  dayHours: number
  nightHours: number
  overtimeDayHours: number
  overtimeNightHours: number
  nightSurcharge: number
}

export interface IAttendanceFilters {
  employeeId?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}

/**
 * Estado global del módulo de asistencia (useState, sin Pinia).
 */
export const useAttendanceState = () => {
  const { authFetch } = useAuthState()

  const records = useState<IAttendanceRecord[]>('att-list', () => [])
  const currentRecord = useState<IAttendanceRecord | null>(
    'att-current',
    () => null,
  )
  const loading = useState<boolean>('att-loading', () => false)
  const error = useState<string>('att-error', () => '')
  const pagination = useState<{
    page: number
    itemsPerPage: number
    total: number
  }>('att-pagination', () => ({ page: 1, itemsPerPage: 10, total: 0 }))
  const filters = useState<IAttendanceFilters>('att-filters', () => ({}))
  const weeklySummary = useState<IAttendanceSummary | null>(
    'att-weekly',
    () => null,
  )
  const monthlySummary = useState<IAttendanceSummary | null>(
    'att-monthly',
    () => null,
  )

  const setError = (err: unknown, fallback: string) => {
    const apiError = err as
      | { data?: { message?: string }; message?: string }
      | null
    error.value = apiError?.data?.message || apiError?.message || fallback
  }

  const fetchRecords = async (query: Record<string, unknown> = {}) => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<{
        items: IAttendanceRecord[]
        total: number
        page: number
      }>(API_PATHS.attendance.list, { query })
      records.value = data.items
      pagination.value = {
        page: data.page,
        itemsPerPage: Number(query.limit) || 10,
        total: data.total,
      }
    } catch (err) {
      setError(err, 'Error al cargar asistencia')
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchRecordById = async (id: string) => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<IAttendanceRecord>(
        API_PATHS.attendance.detail(id),
      )
      currentRecord.value = data
      return data
    } catch (err) {
      setError(err, 'Error al cargar el registro')
      throw err
    } finally {
      loading.value = false
    }
  }

  const createRecord = async (payload: IAttendancePayload) => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<IAttendanceRecord>(
        API_PATHS.attendance.list,
        { method: 'POST', body: payload },
      )
      return data
    } catch (err) {
      setError(err, 'Error al registrar la asistencia')
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateRecord = async (id: string, payload: IAttendancePayload) => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<IAttendanceRecord>(
        API_PATHS.attendance.detail(id),
        { method: 'PUT', body: payload },
      )
      currentRecord.value = data
      return data
    } catch (err) {
      setError(err, 'Error al actualizar el registro')
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteRecord = async (id: string) => {
    loading.value = true
    error.value = ''
    try {
      await authFetch(API_PATHS.attendance.detail(id), { method: 'DELETE' })
    } catch (err) {
      setError(err, 'Error al eliminar el registro')
      throw err
    } finally {
      loading.value = false
    }
  }

  const setStatus = (id: string, endpoint: string) => async () => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<IAttendanceRecord>(endpoint, {
        method: 'PUT',
      })
      currentRecord.value = data
      return data
    } catch (err) {
      setError(err, 'Error al cambiar el estado')
      throw err
    } finally {
      loading.value = false
    }
  }

  const approveRecord = (id: string) => setStatus(id, API_PATHS.attendance.approve(id))()
  const rejectRecord = (id: string) => setStatus(id, API_PATHS.attendance.reject(id))()

  const fetchWeeklySummary = async (employeeId: string) => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<{ summary: IAttendanceSummary }>(
        API_PATHS.attendance.weekly(employeeId),
      )
      weeklySummary.value = data.summary
      return data.summary
    } catch (err) {
      setError(err, 'Error al cargar el resumen semanal')
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchMonthlySummary = async (employeeId: string, month: number, year: number) => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<{ summary: IAttendanceSummary }>(
        API_PATHS.attendance.monthly(employeeId),
        { query: { month, year } },
      )
      monthlySummary.value = data.summary
      return data.summary
    } catch (err) {
      setError(err, 'Error al cargar el resumen mensual')
      throw err
    } finally {
      loading.value = false
    }
  }

  const setFilter = (key: keyof IAttendanceFilters, value: string | undefined) => {
    filters.value = { ...filters.value, [key]: value || undefined }
  }

  const resetFilters = () => {
    filters.value = {}
  }

  const clearCurrentRecord = () => {
    currentRecord.value = null
  }

  return {
    records,
    currentRecord,
    loading,
    error,
    pagination,
    filters,
    weeklySummary,
    monthlySummary,
    fetchRecords,
    fetchRecordById,
    createRecord,
    updateRecord,
    deleteRecord,
    approveRecord,
    rejectRecord,
    fetchWeeklySummary,
    fetchMonthlySummary,
    setFilter,
    resetFilters,
    clearCurrentRecord,
  }
}

export default useAttendanceState
