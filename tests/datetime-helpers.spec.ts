import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatDateInput,
  formatDateParam,
  calculateHoursBetween,
  formatTime,
  getWeekRange,
  isSameDay,
  splitDayNightHours,
  splitOvertimeFromEnd,
  sumHours,
  toDateInputValue,
} from '~~/shared/utils/datetime-helpers'

describe('formatDate', () => {
  it('formatea fechas válidas por defecto a YYYY-MM-DD', () => {
    expect(formatDate('2026-08-26')).toBe('2026-08-26')
    expect(formatDate('2026-08-26T12:00:00')).toBe('2026-08-26')
  })

  it('respeta una plantilla personalizada', () => {
    expect(formatDate('2026-08-26', 'DD/MM/YYYY')).toBe('26/08/2026')
  })

  it('devuelve string vacío para valores nulos o inválidos', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate(undefined)).toBe('')
    expect(formatDate('no-es-fecha')).toBe('')
  })
})

describe('formatDateParam', () => {
  it('normaliza fechas a YYYY-MM-DD', () => {
    expect(formatDateParam('2026-08-26T10:00:00Z')).toBe('2026-08-26')
  })

  it('devuelve undefined para valores vacíos o inválidos', () => {
    expect(formatDateParam('')).toBeUndefined()
    expect(formatDateParam(null)).toBeUndefined()
    expect(formatDateParam('invalida')).toBeUndefined()
  })
})

describe('formatDateInput / toDateInputValue', () => {
  it('conserva fechas ya en formato YYYY-MM-DD', () => {
    expect(formatDateInput('2026-08-26')).toBe('2026-08-26')
  })

  it('convierte Date a YYYY-MM-DD', () => {
    expect(formatDateInput(new Date('2026-08-26T12:00:00Z'))).toBe('2026-08-26')
  })

  it('devuelve string vacío para valores inválidos', () => {
    expect(toDateInputValue('')).toBe('')
    expect(toDateInputValue(null)).toBe('')
  })
})

describe('splitDayNightHours', () => {
  it('turno diurno completo (08:00–18:00)', () => {
    const result = splitDayNightHours('2026-08-26T08:00:00', '2026-08-26T18:00:00')
    expect(result.dayHours).toBe(10)
    expect(result.nightHours).toBe(0)
  })

  it('turno con tramo nocturno (14:00–22:00)', () => {
    const result = splitDayNightHours('2026-08-26T14:00:00', '2026-08-26T22:00:00')
    expect(result.dayHours).toBe(5)
    expect(result.nightHours).toBe(3)
  })

  it('turno nocturno que cruza medianoche (22:00–06:00)', () => {
    const result = splitDayNightHours('2026-08-26T22:00:00', '2026-08-27T06:00:00')
    expect(result.dayHours).toBe(0)
    expect(result.nightHours).toBe(8)
  })

  it('salida anterior a entrada devuelve ceros', () => {
    const result = splitDayNightHours('2026-08-26T18:00:00', '2026-08-26T08:00:00')
    expect(result.dayHours).toBe(0)
    expect(result.nightHours).toBe(0)
  })
})

describe('splitOvertimeFromEnd', () => {
  it('08:00–18:00 (10h) → 2h extra diurnas', () => {
    const result = splitOvertimeFromEnd('2026-08-26T08:00:00', '2026-08-26T18:00:00', 8)
    expect(result.overtimeDayHours).toBe(2)
    expect(result.overtimeNightHours).toBe(0)
  })

  it('08:00–22:00 (14h) → 3h extra diurnas + 3h extra nocturnas', () => {
    const result = splitOvertimeFromEnd('2026-08-26T08:00:00', '2026-08-26T22:00:00', 8)
    expect(result.overtimeDayHours).toBe(3)
    expect(result.overtimeNightHours).toBe(3)
  })

  it('sin horas extras (08:00–16:00)', () => {
    const result = splitOvertimeFromEnd('2026-08-26T08:00:00', '2026-08-26T16:00:00', 8)
    expect(result.overtimeDayHours).toBe(0)
    expect(result.overtimeNightHours).toBe(0)
  })
})

describe('getWeekRange', () => {
  it('calcula inicio (lunes) y fin (domingo) de la semana', () => {
    const range = getWeekRange('2026-08-19')
    expect(range.startDate).toBe('2026-08-17')
    expect(range.endDate).toBe('2026-08-23')
  })

  it('devuelve ISO y Date compatibles', () => {
    const range = getWeekRange('2026-08-19')
    expect(range.startISO.length).toBeGreaterThan(0)
    expect(range.startISO < range.endISO).toBe(true)
    expect(range.start instanceof Date).toBe(true)
    expect(range.end instanceof Date).toBe(true)
  })
})

describe('calculateHoursBetween', () => {
  it('calcula horas dentro del mismo día', () => {
    expect(calculateHoursBetween('2026-08-26T08:00:00', '2026-08-26T17:00:00')).toBe(9)
  })

  it('maneja el cruce de medianoche', () => {
    expect(calculateHoursBetween('2026-08-26T22:00:00', '2026-08-27T04:00:00')).toBe(6)
  })
})

describe('sumHours', () => {
  it('suma horas', () => {
    expect(sumHours([1.5, 2, 0.5])).toBe(4)
  })

  it('lista vacía → 0', () => {
    expect(sumHours([])).toBe(0)
  })
})

describe('formatTime', () => {
  it('formatea a HH:mm por defecto', () => {
    expect(formatTime(new Date(2026, 7, 26, 8, 5))).toBe('08:05')
  })

  it('respeta una plantilla personalizada', () => {
    expect(formatTime(new Date(2026, 7, 26, 8, 5), 'h:mm A')).toBe('8:05 AM')
  })
})

describe('isSameDay', () => {
  it('reconoce el mismo día calendario', () => {
    expect(isSameDay('2026-08-19T08:00:00', '2026-08-19T20:00:00')).toBe(true)
  })

  it('rechaza días distintos o valores inválidos', () => {
    expect(isSameDay('2026-08-19T08:00:00', '2026-08-20T08:00:00')).toBe(false)
    expect(isSameDay(null, '2026-08-20')).toBe(false)
  })
})
