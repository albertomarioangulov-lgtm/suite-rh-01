// ============================================================
// Tipos de ausencia y constantes compartidas (cliente + servidor)
// ============================================================
import dayjs from 'dayjs'

/**
 * Tipos de ausencia soportados por el HRMS.
 * Se usa snake_case para persistencia (estable) y `ABSENCE_TYPE_LABELS`
 * para la presentación en español.
 */
export const ABSENCE_TYPES = {
  PERMISO_MEDICO: 'Permiso_Medico',
  PERMISO_ESCOLAR: 'Permiso_Escolar',
  PERMISO_LEGAL: 'Permiso_Legal',
  PERMISO_BICICLETA: 'Permiso_Bicicleta',
  CALAMIDAD_DOMESTICA: 'Calamidad_Domestica',
  LUTO: 'Luto',
  MATRIMONIO: 'Matrimonio',
  INCAPACIDAD_COMUN: 'Incapacidad_Comun',
  INCAPACIDAD_LABORAL: 'Incapacidad_Laboral',
  VACACIONES: 'Vacaciones',
  SIN_REMUNERAR: 'Sin_Remunerar',
  DESCANSO_COMPENSATORIO: 'Descanso_Compensatorio',
} as const

export type AbsenceType = (typeof ABSENCE_TYPES)[keyof typeof ABSENCE_TYPES]

export const ABSENCE_TYPE_LABELS: Record<AbsenceType, string> = {
  Permiso_Medico: 'Permiso médico',
  Permiso_Escolar: 'Obligación escolar',
  Permiso_Legal: 'Citación legal',
  Permiso_Bicicleta: 'Día de la bicicleta',
  Calamidad_Domestica: 'Calamidad doméstica',
  Luto: 'Luto',
  Matrimonio: 'Matrimonio',
  Incapacidad_Comun: 'Incapacidad común',
  Incapacidad_Laboral: 'Incapacidad laboral',
  Vacaciones: 'Vacaciones',
  Sin_Remunerar: 'Permiso sin remunerar',
  Descanso_Compensatorio: 'Descanso compensatorio',
}

export const ABSENCE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const

export type AbsenceStatus = (typeof ABSENCE_STATUS)[keyof typeof ABSENCE_STATUS]

export const ABSENCE_STATUS_LABELS: Record<AbsenceStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
}

export const ABSENCE_TYPE_LIST = Object.values(ABSENCE_TYPES) as AbsenceType[]

/**
 * Tipos de ausencia remunerados por el empleador (contabilizan días para
 * el salario base y las prestaciones). Las incapacidades se tratan aparte
 * (días 1-2 a cargo del empleador; EPS/ARL cubren el resto).
 */
export const REMUNERATED_ABSENCE_TYPES: AbsenceType[] = [
  ABSENCE_TYPES.PERMISO_MEDICO,
  ABSENCE_TYPES.PERMISO_ESCOLAR,
  ABSENCE_TYPES.PERMISO_LEGAL,
  ABSENCE_TYPES.PERMISO_BICICLETA,
  ABSENCE_TYPES.CALAMIDAD_DOMESTICA,
  ABSENCE_TYPES.LUTO,
  ABSENCE_TYPES.MATRIMONIO,
  ABSENCE_TYPES.VACACIONES,
  ABSENCE_TYPES.DESCANSO_COMPENSATORIO,
]

/** Tipos que requieren aprobación de RRHH/gerencia antes de afectar nómina. */
export const APPROVAL_REQUIRED_ABSENCE_TYPES: AbsenceType[] = [
  ABSENCE_TYPES.VACACIONES,
  ABSENCE_TYPES.SIN_REMUNERAR,
  ABSENCE_TYPES.DESCANSO_COMPENSATORIO,
]

/** Días máximos por año (política por defecto) para cada tipo de permiso. */
export const DEFAULT_MAX_DAYS_PER_YEAR: Partial<Record<AbsenceType, number>> = {
  Permiso_Medico: 5,
  Permiso_Escolar: 1,
  Permiso_Legal: 1,
  Permiso_Bicicleta: 1,
  Calamidad_Domestica: 3,
  Luto: 5,
  Matrimonio: 5,
  Sin_Remunerar: 30,
  Vacaciones: 15,
  Incapacidad_Comun: 180,
  Incapacidad_Laboral: 180,
}

/**
 * Días de incapacidad común que paga el empleador (Ley 100/93): los
 * primeros 2 días; del 3 en adelante los cubre la EPS.
 */
export const DEFAULT_EMPLOYER_PAID_INCAPACIDAD_DAYS = 2

/**
 * Porcentaje de salario que se reconoce por día de incapacidad común
 * (2/3 del salario diario).
 */
export const INCAPACIDAD_COMUN_DAILY_PERCENT = 2 / 3

/**
 * Porcentaje de recargo por trabajo en día de descanso semanal
 * (Ley 2101 de 2021, transición):
 * - 80% hasta el 30/06/2026
 * - 90% hasta el 30/06/2027
 * - 100% desde el 01/07/2027
 */
export const getRestDaySurchargeRate = (date: Date | string): number => {
  const d = dayjs(date)
  if (d.isBefore(dayjs('2026-07-01'))) return 0.8
  if (d.isBefore(dayjs('2027-07-01'))) return 0.9
  return 1
}

/** ¿El tipo de ausencia es remunerado por el empleador? */
export const isRemuneratedAbsence = (type: AbsenceType): boolean =>
  REMUNERATED_ABSENCE_TYPES.includes(type)

/** ¿El tipo de ausencia es una incapacidad (común o laboral)? */
export const isIncapacidad = (type: AbsenceType): boolean =>
  type === ABSENCE_TYPES.INCAPACIDAD_COMUN || type === ABSENCE_TYPES.INCAPACIDAD_LABORAL
