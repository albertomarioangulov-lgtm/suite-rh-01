/**
 * Frecuencias de pago de nómina y su equivalente DIAN (tabla 5.5.1 del
 * anexo técnico del DSNE).
 */
export const PAYROLL_FREQUENCIES = {
  semanal: { label: 'Semanal', dianCode: 1 },
  decenal: { label: 'Decenal', dianCode: 2 },
  catorcenal: { label: 'Catorcenal', dianCode: 3 },
  quincenal: { label: 'Quincenal', dianCode: 4 },
  mensual: { label: 'Mensual', dianCode: 5 },
  otro: { label: 'Otro', dianCode: 6 },
} as const

export const PAYROLL_FREQUENCY_VALUES = [
  'semanal',
  'decenal',
  'catorcenal',
  'quincenal',
  'mensual',
  'otro',
] as const

export type PayrollFrequency = (typeof PAYROLL_FREQUENCY_VALUES)[number]

const fmt = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

const lastDayOf = (year: number, month: number) =>
  new Date(year, month + 1, 0).getDate()

/**
 * Período de pago que contiene la fecha ancla según la frecuencia.
 * Para "otro" no hay regla automática: devuelve null y el usuario define
 * el período manualmente.
 */
export const getPayrollPeriodForDate = (
  frequency: PayrollFrequency,
  anchor: string,
): { start: string; end: string } | null => {
  const date = new Date(`${anchor}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null

  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()

  switch (frequency) {
    case 'semanal': {
      // Semana de lunes a domingo.
      const daysFromMonday = (date.getDay() + 6) % 7
      const start = new Date(year, month, day - daysFromMonday)
      const end = new Date(year, month, day - daysFromMonday + 6)
      return {
        start: fmt(start.getFullYear(), start.getMonth(), start.getDate()),
        end: fmt(end.getFullYear(), end.getMonth(), end.getDate()),
      }
    }
    case 'decenal': {
      // Períodos 1-10, 11-20 y 21-fin de mes.
      const block = Math.floor((day - 1) / 10)
      const startDay = block * 10 + 1
      const endDay = block === 2 ? lastDayOf(year, month) : (block + 1) * 10
      return { start: fmt(year, month, startDay), end: fmt(year, month, endDay) }
    }
    case 'catorcenal': {
      // Períodos 1-14 y 15-fin de mes.
      const startDay = day <= 14 ? 1 : 15
      const endDay = day <= 14 ? 14 : lastDayOf(year, month)
      return { start: fmt(year, month, startDay), end: fmt(year, month, endDay) }
    }
    case 'quincenal': {
      // Períodos 1-15 y 16-fin de mes.
      const startDay = day <= 15 ? 1 : 16
      const endDay = day <= 15 ? 15 : lastDayOf(year, month)
      return { start: fmt(year, month, startDay), end: fmt(year, month, endDay) }
    }
    case 'mensual':
      return {
        start: fmt(year, month, 1),
        end: fmt(year, month, lastDayOf(year, month)),
      }
    case 'otro':
    default:
      return null
  }
}

/**
 * Indica si un período coincide con la regla de la frecuencia.
 * Para "otro" no hay regla automática: se considera válido.
 */
export const matchesPayrollPeriod = (
  frequency: PayrollFrequency,
  period: { start: string; end: string },
): boolean => {
  const suggested = getPayrollPeriodForDate(frequency, period.end)
  if (!suggested) return true
  return suggested.start === period.start && suggested.end === period.end
}
