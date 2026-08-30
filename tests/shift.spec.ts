import { describe, expect, it } from 'vitest'
import { hoursBetweenTimes } from '~~/server/models/Shift'

describe('hoursBetweenTimes', () => {
  it('calcula horas dentro del mismo día', () => {
    expect(hoursBetweenTimes('08:00', '17:00')).toBe(9)
    expect(hoursBetweenTimes('08:00', '12:00')).toBe(4)
  })

  it('maneja el cruce de medianoche (22:00–06:00)', () => {
    expect(hoursBetweenTimes('22:00', '06:00')).toBe(8)
  })

  it('devuelve 0 cuando no hay diferencia', () => {
    expect(hoursBetweenTimes('08:00', '08:00')).toBe(0)
  })
})
