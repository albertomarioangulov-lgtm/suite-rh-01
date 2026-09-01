import { describe, expect, it } from 'vitest'
import {
  computeLateness,
  getShiftStartForDay,
  timeToMinutes,
} from '~~/shared/utils/attendance-helpers'

/** Crea una fecha local (hora exacta) para que getHours sea determinista. */
const at = (hour: number, minute = 0) => new Date(2026, 8, 1, hour, minute)

describe('timeToMinutes', () => {
  it('convierte HH:mm a minutos desde medianoche', () => {
    expect(timeToMinutes('00:00')).toBe(0)
    expect(timeToMinutes('08:00')).toBe(480)
    expect(timeToMinutes('13:30')).toBe(810)
    expect(timeToMinutes('23:59')).toBe(1439)
  })
})

describe('getShiftStartForDay', () => {
  const days = [
    { dayOfWeek: 1, ranges: [{ startTime: '08:00' }, { startTime: '13:00' }] },
    { dayOfWeek: 3, ranges: [{ startTime: '13:00' }] },
  ]

  it('devuelve el inicio del primer rango del día', () => {
    expect(getShiftStartForDay(days, 1)).toBe('08:00')
    expect(getShiftStartForDay(days, 3)).toBe('13:00')
  })

  it('devuelve vacío si el día no tiene turno', () => {
    expect(getShiftStartForDay(days, 5)).toBe('')
    expect(getShiftStartForDay([], 1)).toBe('')
  })
})

describe('computeLateness', () => {
  it('entrada a la hora del turno → no es tarde', () => {
    expect(computeLateness(at(8, 0), '08:00', 5)).toEqual({
      isLate: false,
      lateMinutes: 0,
    })
  })

  it('entrada antes del turno → no es tarde', () => {
    expect(computeLateness(at(7, 45), '08:00', 5)).toEqual({
      isLate: false,
      lateMinutes: 0,
    })
  })

  it('dentro de la tolerancia → no es tarde, pero guarda el retraso real', () => {
    expect(computeLateness(at(8, 4), '08:00', 5)).toEqual({
      isLate: false,
      lateMinutes: 4,
    })
  })

  it('exactamente en el límite de la tolerancia → no es tarde', () => {
    expect(computeLateness(at(8, 5), '08:00', 5)).toEqual({
      isLate: false,
      lateMinutes: 5,
    })
  })

  it('supera la tolerancia → es tarde con el retraso real', () => {
    expect(computeLateness(at(8, 30), '08:00', 5)).toEqual({
      isLate: true,
      lateMinutes: 30,
    })
  })

  it('tolerancia 0 → cualquier retraso es tardanza', () => {
    expect(computeLateness(at(8, 1), '08:00', 0)).toEqual({
      isLate: true,
      lateMinutes: 1,
    })
  })

  it('turno de la tarde (13:00) con retraso de 20 min y tolerancia 10 → tarde', () => {
    expect(computeLateness(at(13, 20), '13:00', 10)).toEqual({
      isLate: true,
      lateMinutes: 20,
    })
  })

  it('sin turno asignado → nunca es tarde', () => {
    expect(computeLateness(at(9, 0), '', 5)).toEqual({
      isLate: false,
      lateMinutes: 0,
    })
  })
})
