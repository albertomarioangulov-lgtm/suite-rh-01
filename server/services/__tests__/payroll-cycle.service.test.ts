import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('~~/server/models/PayrollCycle', () => ({
  PayrollCycle: { findOne: vi.fn(), create: vi.fn() },
}))

vi.mock('~~/server/models/Employee', () => ({
  Employee: { countDocuments: vi.fn() },
}))

import { PayrollCycle } from '~~/server/models/PayrollCycle'
import { ensureDefaultCycle } from '~~/server/services/payroll-cycle.service'

afterEach(() => {
  vi.clearAllMocks()
})

describe('ensureDefaultCycle', () => {
  it('crea el ciclo por defecto con la frecuencia de la empresa', async () => {
    ;(PayrollCycle.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    ;(PayrollCycle.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: 'c1',
    })

    await ensureDefaultCycle('tenant1', 'quincenal')

    expect(PayrollCycle.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant1',
        frequency: 'quincenal',
        isDefault: true,
      }),
    )
  })

  it('actualiza la frecuencia del ciclo por defecto existente', async () => {
    const existing = {
      _id: 'c1',
      frequency: 'mensual',
      save: vi.fn().mockResolvedValue(undefined),
    }
    ;(PayrollCycle.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(
      existing,
    )

    await ensureDefaultCycle('tenant1', 'semanal')

    expect(existing.frequency).toBe('semanal')
    expect(existing.save).toHaveBeenCalled()
    expect(PayrollCycle.create).not.toHaveBeenCalled()
  })
})
