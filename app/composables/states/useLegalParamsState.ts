import { API_PATHS } from '~/utils/api-paths'

export interface ILegalParamsView {
  _id: string
  uvtValue: number
  minimumWage: number
  transportAllowance: number
  withholdingRates: Array<{ from: number; to: number; percentage: number }>
  healthPercentages: { employee: number; employer: number }
  pensionPercentages: { employee: number; employer: number }
  nightSurchargePercentage: number
  overtimeDayPercentage: number
  overtimeNightPercentage: number
  arlRiskClass: number
  arlRates?: Record<string, number>
  parafiscales?: { sena: number; icbf: number; compensationFund: number }
  incapacidadComunDailyPercent?: number
  employerPaidIncapacidadDays?: number
  baseHoursPerMonth?: number
  validFrom?: string
  validTo?: string | null
  active: boolean
  createdAt?: string
  updatedAt?: string
}

/**
 * Estado global de los parámetros legales (useState, sin Pinia).
 */
export const useLegalParamsState = () => {
  const { authFetch } = useAuthState()

  const currentParams = useState<ILegalParamsView | null>('params-current', () => null)
  const historicalParams = useState<ILegalParamsView[]>('params-history', () => [])
  const loading = useState<boolean>('params-loading', () => false)
  const error = useState<string>('params-error', () => '')

  const setError = (err: unknown, fallback: string) => {
    const apiError = err as { data?: { message?: string }; message?: string } | null
    error.value = apiError?.data?.message || apiError?.message || fallback
  }

  const fetchCurrentParams = async (): Promise<ILegalParamsView | null> => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<ILegalParamsView>(API_PATHS.legalParams.current)
      currentParams.value = data
      return data
    } catch (err) {
      const status =
        (err as { statusCode?: number }).statusCode ?? (err as { status?: number }).status
      // 404 = aún no hay período vigente: estado vacío, no un error.
      if (status === 404) {
        currentParams.value = null
        error.value = ''
        throw err
      }
      setError(err, 'Error al cargar los parámetros legales')
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchHistoricalParams = async () => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<ILegalParamsView[]>(API_PATHS.legalParams.historical)
      historicalParams.value = data
    } catch (err) {
      setError(err, 'Error al cargar el historial de parámetros')
      throw err
    } finally {
      loading.value = false
    }
  }

  const createParams = async (data: Omit<ILegalParamsView, '_id' | 'active'>) => {
    loading.value = true
    error.value = ''
    try {
      const created = await authFetch<ILegalParamsView>(API_PATHS.legalParams.current, {
        method: 'POST',
        body: data,
      })
      return created
    } catch (err) {
      setError(err, 'Error al crear el período de parámetros')
      throw err
    } finally {
      loading.value = false
    }
  }

  const activateParams = async (id: string) => {
    loading.value = true
    error.value = ''
    try {
      const activated = await authFetch<ILegalParamsView>(API_PATHS.legalParams.activate(id), {
        method: 'PUT',
      })
      return activated
    } catch (err) {
      setError(err, 'Error al activar el período')
      throw err
    } finally {
      loading.value = false
    }
  }

  const resetState = () => {
    currentParams.value = null
    historicalParams.value = []
    error.value = ''
    loading.value = false
  }

  return {
    currentParams,
    historicalParams,
    loading,
    error,
    fetchCurrentParams,
    fetchHistoricalParams,
    createParams,
    activateParams,
    resetState,
  }
}

export default useLegalParamsState
