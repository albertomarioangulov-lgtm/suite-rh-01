// ============================================================
// Configuración de alertas: tipos, roles destino y defaults
// ============================================================

import type { UserRole } from '~~/shared/auth'

export interface IAlertRule {
  key: string
  label: string
  description: string
  enabled: boolean
  targetRoles: UserRole[]
}

/** Reglas por defecto de las alertas accionables. */
export const DEFAULT_ALERT_RULES: IAlertRule[] = [
  {
    key: 'absence_pending',
    label: 'Permiso pendiente de aprobar',
    description: 'Se crea cuando un empleado solicita un permiso/ausencia.',
    enabled: true,
    targetRoles: ['admin', 'hr', 'manager'],
  },
  {
    key: 'absence_approved',
    label: 'Ausencia aprobada',
    description: 'Se crea cuando RRHH/gerencia aprueba una ausencia.',
    enabled: true,
    targetRoles: ['admin', 'hr', 'manager'],
  },
  {
    key: 'absence_rejected',
    label: 'Ausencia rechazada',
    description: 'Se crea cuando RRHH/gerencia rechaza una ausencia.',
    enabled: true,
    targetRoles: ['admin', 'hr', 'manager'],
  },
  {
    key: 'incapacity_expiring',
    label: 'Incapacidad por vencer',
    description: 'Avisa cuando una incapacidad termina en menos de 3 días.',
    enabled: true,
    targetRoles: ['admin', 'hr'],
  },
  {
    key: 'payroll_draft',
    label: 'Nómina en borrador',
    description: 'Se crea al generar una nómina pendiente de aprobar.',
    enabled: true,
    targetRoles: ['admin', 'hr'],
  },
  {
    key: 'payroll_approved',
    label: 'Nómina aprobada',
    description: 'Se crea cuando una nómina pasa de borrador a aprobada.',
    enabled: true,
    targetRoles: ['admin', 'hr', 'manager'],
  },
  {
    key: 'overtime_limit',
    label: 'Límite de horas extras',
    description: 'Se crea al superar los límites diarios (2h) o semanales (12h).',
    enabled: true,
    targetRoles: ['admin', 'hr', 'manager'],
  },
]

export const getDefaultAlertRules = (): IAlertRule[] =>
  DEFAULT_ALERT_RULES.map((rule) => ({ ...rule, targetRoles: [...rule.targetRoles] }))
