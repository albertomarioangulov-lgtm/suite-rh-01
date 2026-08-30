import {
  ABSENCE_STATUS,
  ABSENCE_TYPE_LABELS,
  type AbsenceStatus,
  type AbsenceType,
} from '~~/shared/absence'
import { API_PATHS } from '~/utils/api-paths'

export interface IAbsenceView {
  _id: string
  tenantId: string
  employee:
    | string
    | {
        _id: string
        firstName: string
        lastName: string
        document: string
        position?: string
      }
  type: AbsenceType
  startDate?: string
  endDate?: string
  days: number
  paidByCompanyDays: number
  companyPaidValue: number
  epsValue: number
  arlValue: number
  scheduledRestDate?: string | null
  surchargePaid: boolean
  supportDocument?: string
  observations?: string
  status: AbsenceStatus
  rejectionReason?: string
  approvedAt?: string
  createdAt?: string
  updatedAt?: string
}

export interface IAbsencePayload {
  employeeId?: string
  type?: AbsenceType
  startDate?: string
  endDate?: string
  scheduledRestDate?: string | null
  supportDocument?: string
  observations?: string
}

export interface IAbsenceFilters {
  employeeId?: string
  type?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}

export const absenceTypeLabel = (type: AbsenceType) =>
  ABSENCE_TYPE_LABELS[type] ?? type

/**
 * Estado global del módulo de ausencias (useState, sin Pinia).
 */
export const useAbsenceState = () => {
  const { authFetch } = useAuthState()

  const records = useState<IAbsenceView[]>('abs-list', () => [])
  const currentRecord = useState<IAbsenceView | null>(
    'abs-current',
    () => null,
  )
  const loading = useState<boolean>('abs-loading', () => false)
  const error = useState<string>('abs-error', () => '')
  const pagination = useState<{
    page: number
    itemsPerPage: number
    total: number
  }>('abs-pagination', () => ({ page: 1, itemsPerPage: 10, total: 0 }))
  const filters = useState<IAbsenceFilters>('abs-filters', () => ({}))

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
        items: IAbsenceView[]
        total: number
        page: number
      }>(API_PATHS.absences.list, { query })
      records.value = data.items
      pagination.value = {
        page: data.page,
        itemsPerPage: Number(query.limit) || 10,
        total: data.total,
      }
    } catch (err) {
      setError(err, 'Error al cargar ausencias')
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchRecordById = async (id: string) => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<IAbsenceView>(
        API_PATHS.absences.detail(id),
      )
      currentRecord.value = data
      return data
    } catch (err) {
      setError(err, 'Error al cargar la ausencia')
      throw err
    } finally {
      loading.value = false
    }
  }

  const createRecord = async (payload: IAbsencePayload) => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<IAbsenceView>(
        API_PATHS.absences.list,
        { method: 'POST', body: payload },
      )
      return data
    } catch (err) {
      setError(err, 'Error al registrar la ausencia')
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateRecord = async (id: string, payload: IAbsencePayload) => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<IAbsenceView>(
        API_PATHS.absences.detail(id),
        { method: 'PUT', body: payload },
      )
      currentRecord.value = data
      return data
    } catch (err) {
      setError(err, 'Error al actualizar la ausencia')
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteRecord = async (id: string) => {
    loading.value = true
    error.value = ''
    try {
      await authFetch(API_PATHS.absences.detail(id), { method: 'DELETE' })
    } catch (err) {
      setError(err, 'Error al eliminar la ausencia')
      throw err
    } finally {
      loading.value = false
    }
  }

  const approveRecord = async (id: string) => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<IAbsenceView>(
        API_PATHS.absences.approve(id),
        { method: 'PUT' },
      )
      currentRecord.value = data
      return data
    } catch (err) {
      setError(err, 'Error al aprobar la ausencia')
      throw err
    } finally {
      loading.value = false
    }
  }

  const rejectRecord = async (id: string, reason: string) => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<IAbsenceView>(
        API_PATHS.absences.reject(id),
        { method: 'PUT', body: { reason } },
      )
      currentRecord.value = data
      return data
    } catch (err) {
      setError(err, 'Error al rechazar la ausencia')
      throw err
    } finally {
      loading.value = false
    }
  }

  const setFilter = (
    key: keyof IAbsenceFilters,
    value: string | undefined,
  ) => {
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
    fetchRecords,
    fetchRecordById,
    createRecord,
    updateRecord,
    deleteRecord,
    approveRecord,
    rejectRecord,
    setFilter,
    resetFilters,
    clearCurrentRecord,
  }
}

export default useAbsenceState
