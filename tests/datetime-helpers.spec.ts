import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatDateInput,
  formatDateParam,
  splitDayNightHours,
  splitOvertimeFromEnd,
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
