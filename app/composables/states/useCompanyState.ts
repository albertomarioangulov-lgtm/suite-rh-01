import { API_PATHS } from '~/utils/api-paths'

export interface ICompanyView {
  _id: string
  name: string
  nit: string
  logo?: string
  address: string
  /** Código DIVIPOLA (5 dígitos) del municipio, requerido para el DSNE. */
  municipalityCode?: string
  /** Frecuencia de pago de nómina (PeriodoNomina en el DSNE). */
  payrollFrequency: 'semanal' | 'decenal' | 'catorcenal' | 'quincenal' | 'mensual' | 'otro'
  /** Ambiente del DSNE: 1 producción, 2 pruebas (habilitación). */
  cenEnvironment: 1 | 2
  softwareId?: string
  softwareSC?: string
  softwarePin?: string
  /** true si hay un certificado .p12 configurado para firmar el DSNE. */
  cenCertificateConfigured?: boolean
  /** Rol del firmante del DSNE: supplier (empleador) o thirdparty (proveedor). */
  cenSignerRole?: 'supplier' | 'thirdparty'
  /** Método de pago del DSNE (tabla 5.3.3.2). */
  paymentMethod?: number
  taxRegime: 'simplified' | 'common'
  workSchedule: {
    maxWeeklyHours: number
    minDailyHours: number
    maxDailyHours: number
    nightShiftStart: string
    nightShiftEnd: string
  }
  absencePolicies?: {
    maxDaysPerYear?: Record<string, number>
    employerPaidIncapacidadDays?: number
    restDaySurchargeOverride?: number | null
    requireSupportDocument?: boolean
  }
  active: boolean
  createdAt?: string
  updatedAt?: string
}

export interface IAuditLogItem {
  _id: string
  module: string
  action: string
  description?: string
  userName?: string
  changes?: unknown
  createdAt?: string
}

/**
 * Estado global de la configuración de empresa (useState, sin Pinia).
 */
export const useCompanyState = () => {
  const { authFetch } = useAuthState()

  const company = useState<ICompanyView | null>('comp-data', () => null)
  const auditLogs = useState<IAuditLogItem[]>('comp-audit', () => [])
  const loading = useState<boolean>('comp-loading', () => false)
  const error = useState<string>('comp-error', () => '')

  const setError = (err: unknown, fallback: string) => {
    const apiError = err as { data?: { message?: string }; message?: string } | null
    error.value = apiError?.data?.message || apiError?.message || fallback
  }

  const fetchCompany = async (): Promise<ICompanyView | null> => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<ICompanyView>(API_PATHS.company.config)
      company.value = data
      return data
    } catch (err) {
      const status =
        (err as { statusCode?: number }).statusCode ?? (err as { status?: number }).status
      // 404 = aún no hay configuración: es un estado vacío, no un error.
      if (status === 404) {
        company.value = null
        error.value = ''
        throw err
      }
      setError(err, 'Error al cargar la configuración de la empresa')
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateCompany = async (data: Partial<ICompanyView>) => {
    loading.value = true
    error.value = ''
    try {
      const updated = await authFetch<ICompanyView>(API_PATHS.company.config, {
        method: 'PUT',
        body: data,
      })
      company.value = updated
      return updated
    } catch (err) {
      setError(err, 'Error al actualizar la configuración de la empresa')
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchAuditLogs = async () => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<{ items: IAuditLogItem[] }>(API_PATHS.company.audit, {
        query: { page: 1, limit: 50 },
      })
      auditLogs.value = data.items
    } catch (err) {
      setError(err, 'Error al cargar el historial de cambios')
      throw err
    } finally {
      loading.value = false
    }
  }

  const resetState = () => {
    company.value = null
    auditLogs.value = []
    error.value = ''
    loading.value = false
  }

  return {
    company,
    auditLogs,
    loading,
    error,
    fetchCompany,
    updateCompany,
    fetchAuditLogs,
    resetState,
  }
}

export default useCompanyState
