import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('~~/server/models/PayrollCycle', () => ({
  PayrollCycle: { findOne: vi.fn(), create: vi.fn() },
}))

vi.mock('~~/server/models/Employee', () => ({
  Employee: { countDocuments: vi.fn(), findOne: vi.fn() },
}))

vi.mock('~~/server/utils/audit', () => ({
  logAudit: vi.fn(),
}))

import { PayrollCycle } from '~~/server/models/PayrollCycle'
import { Employee } from '~~/server/models/Employee'
import { logAudit } from '~~/server/utils/audit'
import {
  ensureDefaultCycle,
  moveEmployeeToCycle,
} from '~~/server/services/payroll-cycle.service'

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

describe('moveEmployeeToCycle', () => {
  const sourceId = '64b000000000000000000001'
  const targetId = '64b000000000000000000002'

  it('mueve al empleado y registra auditoría', async () => {
    const employee = {
      _id: 'e1',
      firstName: 'Ana',
      lastName: 'López',
      payrollCycle: sourceId,
      save: vi.fn().mockResolvedValue(undefined),
      toJSON: vi.fn().mockReturnValue({ _id: 'e1' }),
    }
    ;(Employee.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(employee)

    const result = await moveEmployeeToCycle({
      tenantId: 't1',
      employeeId: 'e1',
      fromCycleId: sourceId,
      fromCycleName: 'Mensual',
      fromCycleIsDefault: false,
      toCycleId: targetId,
      toCycleName: 'Quincenal',
      userId: 'u1',
      userName: 'Admin',
    })

    expect(String(employee.payrollCycle)).toBe(targetId)
    expect(employee.save).toHaveBeenCalled()
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        module: 'payroll-cycle',
        action: 'move',
        entityId: 'e1',
        userName: 'Admin',
      }),
    )
    expect(result).toEqual({ _id: 'e1' })
  })

  it('rechaza si el empleado no pertenece al ciclo de origen', async () => {
    ;(Employee.findOne as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: 'e1',
      firstName: 'Ana',
      lastName: 'López',
      payrollCycle: targetId,
    })

    await expect(
      moveEmployeeToCycle({
        tenantId: 't1',
        employeeId: 'e1',
        fromCycleId: sourceId,
        fromCycleName: 'Mensual',
        fromCycleIsDefault: false,
        toCycleId: targetId,
        toCycleName: 'Quincenal',
      }),
    ).rejects.toMatchObject({ statusCode: 400 })
    expect(logAudit).not.toHaveBeenCalled()
  })
})
