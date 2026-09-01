import { API_PATHS } from '~/utils/api-paths'

export type PayrollStatus = 'draft' | 'approved' | 'paid' | 'cancelled'

export interface IPayrollEntry {
  employee: string | Record<string, any>
  devengados: {
    baseSalary: number
    daysWorked: number
    paidAbsenceDays?: number
    absenceCompanyPaidValue?: number
    absenceEpsValue?: number
    absenceArlValue?: number
    transportAllowance: number
    overtimeDay: number
    overtimeNight: number
    nightSurcharge: number
    bonuses: number
    commissions: number
    total: number
  }
  deducciones: {
    employeeHealth: number
    employeePension: number
    sourceRetention: number
    garnishments: number
    loans: number
    total: number
  }
  seguridadSocial: {
    employerHealth: number
    employerPension: number
    arl: number
    sena: number
    icbf: number
    compensationFund: number
    total: number
  }
  totalToPay: number
  observations?: string
}

export interface IPayrollView {
  _id: string
  tenantId: string
  cycle?: { _id?: string; name?: string; frequency?: string } | string | null
  periodoNomina?: number
  periodStart?: string
  periodEnd?: string
  status: PayrollStatus
  employees: IPayrollEntry[]
  totalEarned: number
  totalDeducted: number
  totalSocialSecurity: number
  totalToPay: number
  createdAt?: string
  updatedAt?: string
}

export interface IPayrollCreatePayload {
  periodStart: string
  periodEnd: string
  cycleId?: string
}

/**
 * Estado global del módulo de nómina (useState, sin Pinia).
 */
export const usePayrollState = () => {
  const { authFetch } = useAuthState()

  const payrolls = useState<IPayrollView[]>('pay-list', () => [])
  const total = useState<number>('pay-total', () => 0)
  const currentPayroll = useState<IPayrollView | null>(
    'pay-current',
    () => null,
  )
  const employeeHistory = useState<Array<Record<string, any>>>(
    'pay-employee-history',
    () => [],
  )
  const payrollHistory = useState<Array<Record<string, any>>>(
    'pay-history',
    () => [],
  )
  const loading = useState<boolean>('pay-loading', () => false)
  const error = useState<string>('pay-error', () => '')

  const setError = (err: unknown, fallback: string) => {
    const apiError = err as
      | { data?: { message?: string }; message?: string }
      | null
    error.value = apiError?.data?.message || apiError?.message || fallback
  }

  const fetchPayrolls = async (query: Record<string, unknown> = {}) => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<{ items: IPayrollView[]; total: number }>(
        API_PATHS.payroll.list,
        { query },
      )
      payrolls.value = data.items
      total.value = data.total
    } catch (err) {
      setError(err, 'Error al cargar nóminas')
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchPayrollById = async (id: string) => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<IPayrollView>(API_PATHS.payroll.detail(id))
      currentPayroll.value = data
      return data
    } catch (err) {
      setError(err, 'Error al cargar la nómina')
      throw err
    } finally {
      loading.value = false
    }
  }

  const createPayroll = async (payload: IPayrollCreatePayload) => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<IPayrollView>(API_PATHS.payroll.list, {
        method: 'POST',
        body: payload,
      })
      return data
    } catch (err) {
      setError(err, 'Error al crear la nómina')
      throw err
    } finally {
      loading.value = false
    }
  }

  const updatePayroll = async (id: string, payload: Record<string, unknown>) => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<IPayrollView>(API_PATHS.payroll.detail(id), {
        method: 'PUT',
        body: payload,
      })
      currentPayroll.value = data
      return data
    } catch (err) {
      setError(err, 'Error al actualizar la nómina')
      throw err
    } finally {
      loading.value = false
    }
  }

  const runAction = (id: string, endpoint: string) => async () => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<IPayrollView>(endpoint, { method: 'PUT' })
      currentPayroll.value = data
      return data
    } catch (err) {
      setError(err, 'Error al ejecutar la acción')
      throw err
    } finally {
      loading.value = false
    }
  }

  const approvePayroll = (id: string) =>
    runAction(id, API_PATHS.payroll.approve(id))()
  const payPayroll = (id: string) => runAction(id, API_PATHS.payroll.pay(id))()
  const cancelPayroll = (id: string) =>
    runAction(id, API_PATHS.payroll.cancel(id))()

  const recalculatePayroll = async (id: string) => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<IPayrollView>(
        API_PATHS.payroll.recalculate(id),
        { method: 'POST' },
      )
      currentPayroll.value = data
      return data
    } catch (err) {
      setError(err, 'Error al recalcular la nómina')
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchEmployeeHistory = async (employeeId: string) => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<Array<Record<string, any>>>(
        API_PATHS.payroll.employeeHistory(employeeId),
      )
      employeeHistory.value = data
    } catch (err) {
      setError(err, 'Error al cargar el historial del empleado')
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchPayrollHistory = async (id: string) => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<Array<Record<string, any>>>(
        API_PATHS.payroll.history(id),
      )
      payrollHistory.value = data
    } catch (err) {
      setError(err, 'Error al cargar el historial de la nómina')
      throw err
    } finally {
      loading.value = false
    }
  }

  const clearCurrentPayroll = () => {
    currentPayroll.value = null
    employeeHistory.value = []
  }

  return {
    payrolls,
    total,
    currentPayroll,
    employeeHistory,
    payrollHistory,
    loading,
    error,
    fetchPayrolls,
    fetchPayrollById,
    createPayroll,
    updatePayroll,
    approvePayroll,
    payPayroll,
    cancelPayroll,
    recalculatePayroll,
    fetchEmployeeHistory,
    fetchPayrollHistory,
    clearCurrentPayroll,
  }
}

export default usePayrollState
