import { API_PATHS } from '~/utils/api-paths'

export type LoanStatus = 'active' | 'paid' | 'cancelled'

export interface ILoanView {
  _id: string
  tenantId: string
  employee:
    | string
    | { _id: string; firstName: string; lastName: string; document: string }
  description?: string
  principal: number
  interestRate: number
  totalWithInterest: number
  termMonths: number
  installment: number
  balance: number
  startDate?: string
  status: LoanStatus
  payments: Array<{
    periodStart?: string
    periodEnd?: string
    amount: number
    type: 'installment' | 'manual'
    paidAt?: string
  }>
  createdAt?: string
  updatedAt?: string
}

export interface ILoanPayload {
  employeeId?: string
  description?: string
  principal?: number
  interestRate?: number
  termMonths?: number
  startDate?: string
}

/**
 * Estado global del módulo de préstamos (useState, sin Pinia).
 */
export const useLoanState = () => {
  const { authFetch } = useAuthState()

  const loans = useState<ILoanView[]>('loan-list', () => [])
  const currentLoan = useState<ILoanView | null>('loan-current', () => null)
  const loading = useState<boolean>('loan-loading', () => false)
  const error = useState<string>('loan-error', () => '')
  const pagination = useState<{
    page: number
    itemsPerPage: number
    total: number
  }>('loan-pagination', () => ({ page: 1, itemsPerPage: 10, total: 0 }))

  const setError = (err: unknown, fallback: string) => {
    const apiError = err as
      | { data?: { message?: string }; message?: string }
      | null
    error.value = apiError?.data?.message || apiError?.message || fallback
  }

  const fetchLoans = async (query: Record<string, unknown> = {}) => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<{
        items: ILoanView[]
        total: number
        page: number
      }>(API_PATHS.loans.list, { query })
      loans.value = data.items
      pagination.value = {
        page: data.page,
        itemsPerPage: Number(query.limit) || 10,
        total: data.total,
      }
    } catch (err) {
      setError(err, 'Error al cargar préstamos')
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchLoanById = async (id: string) => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<ILoanView>(API_PATHS.loans.detail(id))
      currentLoan.value = data
      return data
    } catch (err) {
      setError(err, 'Error al cargar el préstamo')
      throw err
    } finally {
      loading.value = false
    }
  }

  const createLoan = async (payload: ILoanPayload) => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<ILoanView>(API_PATHS.loans.list, {
        method: 'POST',
        body: payload,
      })
      return data
    } catch (err) {
      setError(err, 'Error al crear el préstamo')
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateLoan = async (
    id: string,
    payload: { description?: string; status?: LoanStatus },
  ) => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<ILoanView>(API_PATHS.loans.detail(id), {
        method: 'PUT',
        body: payload,
      })
      currentLoan.value = data
      return data
    } catch (err) {
      setError(err, 'Error al actualizar el préstamo')
      throw err
    } finally {
      loading.value = false
    }
  }

  const addPayment = async (id: string, amount: number) => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<ILoanView>(API_PATHS.loans.payment(id), {
        method: 'POST',
        body: { amount },
      })
      currentLoan.value = data
      return data
    } catch (err) {
      setError(err, 'Error al registrar el abono')
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    loans,
    currentLoan,
    loading,
    error,
    pagination,
    fetchLoans,
    fetchLoanById,
    createLoan,
    updateLoan,
    addPayment,
  }
}

export default useLoanState
