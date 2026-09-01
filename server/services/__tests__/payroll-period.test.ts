import { describe, expect, it } from 'vitest'
import {
  getPayrollPeriodForDate,
  matchesPayrollPeriod,
} from '~~/shared/payroll-period'

describe('getPayrollPeriodForDate', () => {
  it('mensual: del 1 al último día del mes', () => {
    expect(getPayrollPeriodForDate('mensual', '2026-08-15')).toEqual({
      start: '2026-08-01',
      end: '2026-08-31',
    })
  })

  it('quincenal: 1-15 y 16-fin de mes', () => {
    expect(getPayrollPeriodForDate('quincenal', '2026-08-20')).toEqual({
      start: '2026-08-16',
      end: '2026-08-31',
    })
    expect(getPayrollPeriodForDate('quincenal', '2026-08-10')).toEqual({
      start: '2026-08-01',
      end: '2026-08-15',
    })
  })

  it('semanal: lunes a domingo', () => {
    // 2026-08-14 es viernes.
    expect(getPayrollPeriodForDate('semanal', '2026-08-14')).toEqual({
      start: '2026-08-10',
      end: '2026-08-16',
    })
  })

  it('otro: no sugiere período automático', () => {
    expect(getPayrollPeriodForDate('otro', '2026-08-14')).toBeNull()
  })
})

describe('matchesPayrollPeriod', () => {
  it('acepta el período que calza con la frecuencia', () => {
    expect(
      matchesPayrollPeriod('mensual', {
        start: '2026-08-01',
        end: '2026-08-31',
      }),
    ).toBe(true)
  })

  it('rechaza un período que no calza', () => {
    expect(
      matchesPayrollPeriod('mensual', {
        start: '2026-08-01',
        end: '2026-08-15',
      }),
    ).toBe(false)
  })

  it('no valida regla para frecuencia "otro"', () => {
    expect(
      matchesPayrollPeriod('otro', {
        start: '2026-08-05',
        end: '2026-08-19',
      }),
    ).toBe(true)
  })
})
