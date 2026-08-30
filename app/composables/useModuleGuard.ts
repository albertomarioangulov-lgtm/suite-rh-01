import { FEATURE_FLAGS, type FeatureFlag } from '~~/shared/feature-flags'

const FLAG_BY_PATH: Record<string, FeatureFlag> = {
  '/admin/employees': FEATURE_FLAGS.EMPLOYEES,
  '/admin/attendance': FEATURE_FLAGS.ATTENDANCE,
  '/admin/shifts': FEATURE_FLAGS.SHIFTS,
  '/admin/ausencias': FEATURE_FLAGS.ABSENCES,
  '/admin/payroll': FEATURE_FLAGS.PAYROLL,
  '/admin/loans': FEATURE_FLAGS.LOANS,
  '/reports': FEATURE_FLAGS.ANALYTICS,
}

/**
 * Guard de módulos: si el feature flag del módulo está desactivado para el
 * tenant, redirige al inicio. Se invoca en el setup de cada página de módulo.
 */
export const useModuleGuard = () => {
  const route = useRoute()
  const { enabledFlags, fetchFlags } = useFeatureFlagsState()

  const check = async () => {
    if (enabledFlags.value.length === 0) {
      await fetchFlags()
    }
    const flag = Object.entries(FLAG_BY_PATH).find(([prefix]) =>
      route.path.startsWith(prefix),
    )?.[1]
    if (flag && !enabledFlags.value.includes(flag)) {
      await navigateTo('/home')
      return false
    }
    return true
  }

  onMounted(check)
  return { check }
}
