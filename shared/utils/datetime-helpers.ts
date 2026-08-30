import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration.js'
import isBetween from 'dayjs/plugin/isBetween.js'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
import relativeTime from 'dayjs/plugin/relativeTime.js'
import 'dayjs/locale/es.js'

dayjs.extend(duration)
dayjs.extend(isBetween)
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(relativeTime)
dayjs.locale('es')

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/

/**
 * Convierte una fecha a string YYYY-MM-DD para enviar como parámetro en requests.
 * Retorna undefined si la fecha es inválida o vacía.
 */
export const formatDateParam = (date: string | null | undefined): string | undefined => {
  if (!date) return undefined
  const d = dayjs(date)
  return d.isValid() ? d.format('YYYY-MM-DD') : undefined
}

/**
 * Normaliza un valor de fecha (Date o string) a string YYYY-MM-DD.
 * Retorna '' si el valor es vacío o inválido.
 * Si el valor ya es un string YYYY-MM-DD, se devuelve tal cual para evitar
 * el desfase de zona horaria al convertirlo a Date.
 */
export const formatDateInput = (value: Date | string | null | undefined): string => {
  if (!value) return ''
  if (typeof value === 'string' && DATE_ONLY_REGEX.test(value)) return value
  const d = dayjs(value)
  return d.isValid() ? d.format('YYYY-MM-DD') : ''
}

/**
 * Convierte un valor de fecha (Date o string) a string YYYY-MM-DD
 * para pre-cargar inputs de fecha (v-date-input, input[type=date]).
 * Usa la zona horaria local para no desfasarse.
 */
export const toDateInputValue = (value: Date | string | null | undefined): string =>
  formatDateInput(value)

/**
 * Formatea una fecha con una plantilla de dayjs (por defecto YYYY-MM-DD).
 * Retorna '' si el valor es vacío o inválido.
 */
export const formatDate = (
  value: Date | string | null | undefined,
  template = 'YYYY-MM-DD',
): string => {
  if (!value) return ''
  const d = dayjs(value)
  return d.isValid() ? d.format(template) : ''
}

/**
 * Formatea fecha y hora como YYYY-MM-DD HH:mm:ss.
 */
export const formatDateTime = (value: Date | string | null | undefined): string =>
  formatDate(value, 'YYYY-MM-DD HH:mm:ss')

/**
 * Formatea solo la hora (por defecto HH:mm).
 */
export const formatTime = (value: Date | string | null | undefined, template = 'HH:mm'): string =>
  formatDate(value, template)

/**
 * Convierte "YYYY-MM-DD" (fecha de calendario sin hora) a un Date inmune a
 * desfases de zona horaria. Usa mediodía UTC (T12:00:00.000Z).
 * Retorna undefined si el valor es vacío o inválido.
 */
export const parseDateOnly = (date: string | null | undefined): Date | undefined => {
  if (!date || !DATE_ONLY_REGEX.test(date)) return undefined
  return dayjs(`${date}T12:00:00.000Z`).toDate()
}

/**
 * Convierte YYYY-MM-DD al inicio del día en Colombia (UTC-5) como Date UTC.
 * Útil para filtros de rango con $gte en MongoDB.
 */
export const getStartOfDay = (date: string): Date => dayjs(`${date}T05:00:00.000Z`).toDate()

/**
 * Convierte YYYY-MM-DD al último milisegundo del día en Colombia (UTC-5) como Date UTC.
 * Útil para filtros de rango con $lte en MongoDB.
 */
export const getEndOfDay = (date: string): Date =>
  dayjs(`${date}T05:00:00.000Z`).add(1, 'day').subtract(1, 'ms').toDate()

/**
 * Devuelve el rango de la semana (lunes a domingo con locale es) de una fecha.
 */
export const getWeekRange = (date?: Date | string | null) => {
  const base = dayjs(date ?? undefined)
  const start = base.startOf('week')
  const end = base.endOf('week')

  return {
    start: start.toDate(),
    end: end.toDate(),
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    startDate: start.format('YYYY-MM-DD'),
    endDate: end.format('YYYY-MM-DD'),
  }
}

/**
 * Verifica si dos fechas corresponden al mismo día calendario.
 */
export const isSameDay = (
  a: Date | string | null | undefined,
  b: Date | string | null | undefined,
): boolean => {
  if (!a || !b) return false
  return dayjs(a).isSame(dayjs(b), 'day')
}

/**
 * Verifica si la hora está en horario nocturno (18:00 - 05:59).
 */
export const isNightTime = (value?: Date | string | null): boolean => {
  const hour = dayjs(value ?? undefined).hour()
  return hour >= 18 || hour < 6
}

/**
 * Calcula las horas (decimales) entre dos fechas.
 */
export const calculateHoursBetween = (start: Date | string, end: Date | string): number => {
  const s = dayjs(start)
  const e = dayjs(end)
  if (!s.isValid() || !e.isValid()) return 0
  return Number(e.diff(s, 'hour', true).toFixed(2))
}

/**
 * Suma un arreglo de horas, ignorando valores no numéricos.
 */
export const sumHours = (hours: number[]): number =>
  hours.reduce((acc, h) => acc + (Number.isFinite(h) ? h : 0), 0)

/**
 * Divide las horas de un turno entre diurnas y nocturnas según la ventana
 * nocturna de la empresa (ej. 19:00–06:00, cruza la medianoche).
 * Devuelve horas con precisión de minutos.
 */
export const splitDayNightHours = (
  start: Date | string,
  end: Date | string,
  nightStart = '19:00',
  nightEnd = '06:00',
): { dayHours: number; nightHours: number } => {
  const startMs = dayjs(start).valueOf()
  const endMs = dayjs(end).valueOf()
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return { dayHours: 0, nightHours: 0 }
  }

  const [nightStartHour, nightStartMinute] = nightStart.split(':').map(Number)
  const [nightEndHour, nightEndMinute] = nightEnd.split(':').map(Number)
  const nightStartMs = nightStartHour * 3_600_000 + nightStartMinute * 60_000
  const nightEndMs = nightEndHour * 3_600_000 + nightEndMinute * 60_000
  const dayMs = 86_400_000

  let nightMs = 0
  let cursor = startMs

  // Barre el turno por tramos de un día para no perder la medianoche.
  while (cursor < endMs) {
    const dayStart = dayjs(cursor).startOf('day')
    const segmentEnd = Math.min(endMs, dayStart.valueOf() + dayMs)
    const fromOffset = cursor - dayStart.valueOf()
    const toOffset = segmentEnd - dayStart.valueOf()

    if (nightStartMs < dayMs) {
      const segStart = Math.max(fromOffset, nightStartMs)
      const segEnd = Math.min(toOffset, dayMs)
      if (segEnd > segStart) nightMs += segEnd - segStart
    }
    if (nightEndMs > 0) {
      const segStart = Math.max(fromOffset, 0)
      const segEnd = Math.min(toOffset, nightEndMs)
      if (segEnd > segStart) nightMs += segEnd - segStart
    }

    cursor = segmentEnd
  }

  const totalMs = endMs - startMs
  return {
    dayHours: Math.round(((totalMs - nightMs) / 3_600_000) * 100) / 100,
    nightHours: Math.round((nightMs / 3_600_000) * 100) / 100,
  }
}

/**
 * Clasifica las horas EXTRA tomándolas desde el final del turno: asume que
 * el empleado completa primero la jornada regular y las horas adicionales
 * ocurren al final. Devuelve la porción diurna y nocturna de esas extras.
 */
export const splitOvertimeFromEnd = (
  start: Date | string,
  end: Date | string,
  regularHours = 8,
  nightStart = '19:00',
  nightEnd = '06:00',
): { overtimeDayHours: number; overtimeNightHours: number } => {
  const startMs = dayjs(start).valueOf()
  const endMs = dayjs(end).valueOf()
  const totalMs = endMs - startMs
  const totalHours = totalMs / 3_600_000
  const overtimeMs = Math.max(0, totalMs - regularHours * 3_600_000)
  if (overtimeMs <= 0) return { overtimeDayHours: 0, overtimeNightHours: 0 }

  const overtimeStart = startMs + (totalMs - overtimeMs)
  const { dayHours, nightHours } = splitDayNightHours(
    new Date(overtimeStart),
    new Date(endMs),
    nightStart,
    nightEnd,
  )
  const sum = dayHours + nightHours || 1
  const overtimeHours = overtimeMs / 3_600_000
  return {
    overtimeDayHours: Math.round((dayHours / sum) * overtimeHours * 100) / 100,
    overtimeNightHours: Math.round((nightHours / sum) * overtimeHours * 100) / 100,
  }
}
