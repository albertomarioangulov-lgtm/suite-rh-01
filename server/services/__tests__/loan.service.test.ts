import { describe, expect, it } from 'vitest'
import {
  calculateInstallment,
  formatLoanPeriod,
} from '~~/server/services/loan.service'

describe('calculateInstallment', () => {
  it('cuota fija (método francés) con tasa mensual', () => {
    expect(calculateInstallment(1000000, 0.015, 12)).toBe(91679.99)
    expect(calculateInstallment(500000, 0.01, 6)).toBe(86274.18)
  })

  it('con tasa 0 → capital ÷ número de cuotas', () => {
    expect(calculateInstallment(1000000, 0, 12)).toBe(83333.33)
  })

  it('redondea a 2 decimales', () => {
    const result = calculateInstallment(333333, 0.02, 24)
    expect(Math.round(result * 100) / 100).toBe(result)
  })
})

describe('formatLoanPeriod', () => {
  it('formatea el período como DD/MM/YYYY – DD/MM/YYYY', () => {
    const start = new Date(2026, 6, 1)
    const end = new Date(2026, 6, 31)
    expect(formatLoanPeriod(start, end)).toBe('01/07/2026 – 31/07/2026')
  })
})
