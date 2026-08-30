import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('~~/server/models/Attendance', () => ({
  Attendance: { getRangeSummary: vi.fn() },
}))

vi.mock('~~/server/models/Company', () => ({
  Company: { getConfig: vi.fn() },
}))

vi.mock('~~/server/models/LegalParams', () => ({
  LegalParams: { getCurrent: vi.fn() },
}))

vi.mock('~~/server/models/Employee', () => ({
  Employee: { find: vi.fn(), findById: vi.fn() },
}))

vi.mock('~~/server/models/Payroll', () => ({
  Payroll: { findOne: vi.fn(), findById: vi.fn(), create: vi.fn() },
}))

vi.mock('~~/server/models/Absence', () => ({
  Absence: {
    findApprovedByEmployeeAndRange: vi.fn(async () => []),
  },
}))

vi.mock('~~/server/utils/audit', () => ({
  logAudit: vi.fn(),
}))

import { Attendance } from '~~/server/models/Attendance'
import { Absence } from '~~/server/models/Absence'
import { Payroll } from '~~/server/models/Payroll'
import { ABSENCE_TYPES } from '~~/shared/absence'
import {
  calculateDeducciones,
  calculateDevengados,
  calculateSeguridadSocial,
  validatePayrollPeriod,
} from '~~/server/services/payroll.service'

afterEach(() => {
  vi.clearAllMocks()
})

describe('calculateDevengados', () => {
  it('prorratea el salario por días trabajados y calcula extras y auxilio', async () => {
    ;(Attendance.getRangeSummary as ReturnType<typeof vi.fn>).mockResolvedValue({
      days: 10,
      hoursWorked: 80,
      dayHours: 80,
      nightHours: 0,
      overtimeDayHours: 2,
      overtimeNightHours: 0,
      nightSurcharge: 0,
    })

    const result = await calculateDevengados(
      { _id: 'emp1', baseSalary: 1500000 },
      new Date('2026-08-01'),
      new Date('2026-08-30'),
      { minimumWage: 1300000, transportAllowance: 162000, uvtValue: 47000 },
    )

    expect(result.daysWorked).toBe(10)
    expect(result.baseSalary).toBe(500000) // 1.500.000 * 10/30
    expect(result.transportAllowance).toBe(54000) // 162.000 * 10/30
    expect(result.overtimeDay).toBe(15625) // 2h * (1.500.000/240) * 1.25
    expect(result.total).toBe(569625)
  })

  it('sin asistencia en el período → devengados en 0 (prorrateo 0 días)', async () => {
    ;(Attendance.getRangeSummary as ReturnType<typeof vi.fn>).mockResolvedValue({
      days: 0,
      hoursWorked: 0,
      dayHours: 0,
      nightHours: 0,
      overtimeDayHours: 0,
      overtimeNightHours: 0,
      nightSurcharge: 0,
    })

    const result = await calculateDevengados(
      { _id: 'emp1', baseSalary: 1500000 },
      new Date('2026-08-01'),
      new Date('2026-08-30'),
      { minimumWage: 1300000, transportAllowance: 162000 },
    )

    expect(result.baseSalary).toBe(0)
    expect(result.total).toBe(0)
  })

  it('suma días de permisos remunerados y valores de incapacidad', async () => {
    ;(Attendance.getRangeSummary as ReturnType<typeof vi.fn>).mockResolvedValue({
      days: 10,
      hoursWorked: 80,
      dayHours: 80,
      nightHours: 0,
      overtimeDayHours: 0,
      overtimeNightHours: 0,
      nightSurcharge: 0,
    })
    ;(Absence.findApprovedByEmployeeAndRange as ReturnType<typeof vi.fn>).mockResolvedValue([
      { type: ABSENCE_TYPES.PERMISO_MEDICO, days: 5 },
      {
        type: ABSENCE_TYPES.INCAPACIDAD_COMUN,
        days: 4,
        companyPaidValue: 66_666.67,
        epsValue: 200_000,
      },
    ])

    const result = await calculateDevengados(
      { _id: 'emp1', baseSalary: 1_500_000 },
      new Date('2026-08-01'),
      new Date('2026-08-30'),
      { minimumWage: 1_300_000, transportAllowance: 162_000, uvtValue: 47_000 },
    )

    // 10 asistencia + 5 permiso remunerado = 15/30 días.
    expect(result.daysWorked).toBe(15)
    expect(result.paidAbsenceDays).toBe(5)
    expect(result.baseSalary).toBe(750_000)
    expect(result.absenceCompanyPaidValue).toBe(66_666.67)
    expect(result.absenceEpsValue).toBe(200_000)
  })
})

describe('calculateDeducciones', () => {
  it('salud y pensión al 4% del IBC (base + auxilio)', () => {
    const result = calculateDeducciones(
      { baseSalary: 1500000, transportAllowance: 162000 },
      { uvtValue: 47000, withholdingRates: [] },
    )
    expect(result.employeeHealth).toBe(66480) // 4% de 1.662.000
    expect(result.employeePension).toBe(66480)
    expect(result.sourceRetention).toBe(0)
  })

  it('aplica retención por rango de UVT', () => {
    const result = calculateDeducciones(
      { baseSalary: 1500000, transportAllowance: 0 },
      {
        uvtValue: 47000,
        withholdingRates: [
          { from: 0, to: 10, percentage: 0 },
          { from: 10, to: 20, percentage: 5 },
          { from: 20, to: 100, percentage: 10 },
        ],
      },
    )
    // 1.500.000 / 47.000 ≈ 31.9 UVT → rango 20-100
    expect(result.sourceRetention).toBe(56000) // (1.500.000 - 940.000) * 10%
  })
})

describe('calculateSeguridadSocial', () => {
  it('calcula aportes empleador con clase de riesgo 3 y parafiscales', () => {
    const result = calculateSeguridadSocial(
      { baseSalary: 1500000, transportAllowance: 162000 },
      {},
      3,
    )
    expect(result.employerHealth).toBe(141270) // 8.5% de 1.662.000
    expect(result.employerPension).toBe(199440) // 12%
    expect(result.arl).toBe(36540) // 1.500.000 * 2.436%
    expect(result.sena).toBe(33240) // 2%
    expect(result.icbf).toBe(49860) // 3%
    expect(result.compensationFund).toBe(66480) // 4%
    expect(result.total).toBe(
      141270 + 199440 + 36540 + 33240 + 49860 + 66480,
    )
  })
})

describe('validatePayrollPeriod', () => {
  it('lanza 409 si ya existe una nómina en el período', async () => {
    ;(Payroll.findOne as ReturnType<typeof vi.fn>).mockResolvedValue({ _id: 'x' })

    await expect(
      validatePayrollPeriod(
        'company1',
        new Date('2026-08-01'),
        new Date('2026-08-30'),
      ),
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it('no lanza error si el período está libre', async () => {
    ;(Payroll.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    await expect(
      validatePayrollPeriod(
        'company1',
        new Date('2026-09-01'),
        new Date('2026-09-30'),
      ),
    ).resolves.toBeUndefined()
  })
})
