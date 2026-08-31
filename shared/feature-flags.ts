// ============================================================
// Catálogo de feature flags (módulos del HRMS)
// Cada flag decide si un módulo está disponible para el tenant.
// El proveedor de licencias (local/Zentitle/Reprise) resuelve el valor.
// ============================================================

import type { UserRole } from '~~/shared/auth'

export const FEATURE_FLAGS = {
  EMPLOYEES: 'employees',
  ATTENDANCE: 'attendance',
  SHIFTS: 'shifts',
  ABSENCES: 'absences',
  PAYROLL: 'payroll',
  LOANS: 'loans',
  ANALYTICS: 'analytics',
  PERFORMANCE: 'performance',
  RECRUITMENT: 'recruitment',
  CONTRACTS: 'contracts',
  SELF_SERVICE: 'self_service',
} as const

export type FeatureFlag = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS]

export const FEATURE_FLAG_LIST = Object.values(FEATURE_FLAGS) as FeatureFlag[]

/** Defaults por rol: qué módulos ve cada rol cuando el flag está activo. */
export const DEFAULT_FLAGS_BY_ROLE: Record<UserRole, FeatureFlag[]> = {
  admin: [
    FEATURE_FLAGS.EMPLOYEES,
    FEATURE_FLAGS.ATTENDANCE,
    FEATURE_FLAGS.SHIFTS,
    FEATURE_FLAGS.ABSENCES,
    FEATURE_FLAGS.PAYROLL,
    FEATURE_FLAGS.LOANS,
    FEATURE_FLAGS.ANALYTICS,
    FEATURE_FLAGS.PERFORMANCE,
    FEATURE_FLAGS.RECRUITMENT,
    FEATURE_FLAGS.CONTRACTS,
    FEATURE_FLAGS.SELF_SERVICE,
  ],
  manager: [
    FEATURE_FLAGS.EMPLOYEES,
    FEATURE_FLAGS.ATTENDANCE,
    FEATURE_FLAGS.SHIFTS,
    FEATURE_FLAGS.ABSENCES,
    FEATURE_FLAGS.PAYROLL,
    FEATURE_FLAGS.LOANS,
    FEATURE_FLAGS.ANALYTICS,
  ],
  hr: [
    FEATURE_FLAGS.EMPLOYEES,
    FEATURE_FLAGS.ATTENDANCE,
    FEATURE_FLAGS.SHIFTS,
    FEATURE_FLAGS.ABSENCES,
    FEATURE_FLAGS.PAYROLL,
    FEATURE_FLAGS.LOANS,
    FEATURE_FLAGS.ANALYTICS,
  ],
  employee: [FEATURE_FLAGS.SELF_SERVICE],
}

/**
 * Módulos que aún no están construidos (placeholder): el flag existe para
 * preparar el licenciamiento, pero no hay rutas que proteger todavía.
 */
export const UNBUILT_MODULES: FeatureFlag[] = [
  FEATURE_FLAGS.RECRUITMENT,
]

export const getDefaultFlags = (): FeatureFlag[] => [
  FEATURE_FLAGS.EMPLOYEES,
  FEATURE_FLAGS.ATTENDANCE,
  FEATURE_FLAGS.SHIFTS,
  FEATURE_FLAGS.ABSENCES,
  FEATURE_FLAGS.PAYROLL,
  FEATURE_FLAGS.LOANS,
  FEATURE_FLAGS.ANALYTICS,
  FEATURE_FLAGS.PERFORMANCE,
]
