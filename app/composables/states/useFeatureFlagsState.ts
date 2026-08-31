import { API_BASE } from '~/utils/api-paths'
import { FEATURE_FLAGS, type FeatureFlag } from '~~/shared/feature-flags'

export const FEATURE_FLAG_LABELS: Record<FeatureFlag, string> = {
  employees: 'Empleados',
  attendance: 'Asistencia',
  shifts: 'Turnos',
  absences: 'Ausencias',
  payroll: 'Nómina',
  loans: 'Préstamos',
  analytics: 'Reportes y analítica',
  performance: 'Evaluación de desempeño',
  recruitment: 'Reclutamiento',
  contracts: 'Contratos',
  self_service: 'Portal de autoservicio',
}

/**
 * Estado global de feature flags (useState, sin Pinia).
 * Decide qué módulos se muestran según el tenant (y la licencia externa).
 */
export const useFeatureFlagsState = () => {
  const { authFetch } = useAuthState()

  const enabledFlags = useState<FeatureFlag[]>('feature-flags', () => [])
  const loading = useState<boolean>('feature-flags-loading', () => false)
  const error = useState<string>('feature-flags-error', () => '')

  const fetchFlags = async () => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<{ flags: FeatureFlag[] }>(
        `${API_BASE}/flags`,
      )
      enabledFlags.value = data.flags ?? []
      return data.flags
    } catch (err) {
      const apiError = err as
        | { data?: { message?: string }; message?: string }
        | null
      error.value = apiError?.data?.message || apiError?.message || 'Error al cargar módulos'
      return []
    } finally {
      loading.value = false
    }
  }

  const isEnabled = (flag: FeatureFlag) => enabledFlags.value.includes(flag)
  const isEnabledComputed = (flag: FeatureFlag) => computed(() => isEnabled(flag))

  return {
    enabledFlags,
    loading,
    error,
    fetchFlags,
    isEnabled,
    isEnabledComputed,
  }
}

export default useFeatureFlagsState
export { FEATURE_FLAGS }
