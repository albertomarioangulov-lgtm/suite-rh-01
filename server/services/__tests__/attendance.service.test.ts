import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('~~/server/models/Attendance', () => ({
  Attendance: {
    find: vi.fn(),
    findById: vi.fn(),
    countDocuments: vi.fn(),
  },
  REGULAR_DAILY_HOURS: 8,
  NIGHT_SURCHARGE_RATE: 0.35,
}))

vi.mock('~~/server/models/Alert', () => ({
  Alert: { create: vi.fn(async () => ({ _id: 'alert1', toJSON: () => ({}) })) },
}))

import { Attendance } from '~~/server/models/Attendance'
import { Alert } from '~~/server/models/Alert'
import {
  calculateHours,
  calculateOvertimeHours,
  generateAlert,
  validateDailyLimit,
  validateWeeklyLimit,
} from '~~/server/services/attendance.service'

const mockFindLean = (records: Array<Record<string, unknown>>) => {
  ;(Attendance.find as ReturnType<typeof vi.fn>).mockReturnValue({
    lean: () => records,
  })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('calculateHours', () => {
  it('entrada 08:00 salida 17:00 → 9h totales, 9 diurnas, 0 nocturnas', () => {
    const result = calculateHours('2026-08-26T08:00:00', '2026-08-26T17:00:00')
    expect(result.hoursWorked).toBe(9)
    expect(result.dayHours).toBe(9)
    expect(result.nightHours).toBe(0)
  })

  it('entrada 20:00 salida 04:00 (cruza medianoche) → 8h, 0 diurnas, 8 nocturnas', () => {
    const result = calculateHours('2026-08-26T20:00:00', '2026-08-27T04:00:00')
    expect(result.hoursWorked).toBe(8)
    expect(result.dayHours).toBe(0)
    expect(result.nightHours).toBe(8)
  })

  it('entrada 08:00 salida 20:00 → 12h totales, 11 diurnas, 1 nocturna', () => {
    const result = calculateHours('2026-08-26T08:00:00', '2026-08-26T20:00:00')
    expect(result.hoursWorked).toBe(12)
    expect(result.dayHours).toBe(11)
    expect(result.nightHours).toBe(1)
  })
})

describe('calculateOvertimeHours', () => {
  it('9h trabajadas en un día → 1h extra (diurna si el turno es diurno)', () => {
    const result = calculateOvertimeHours({ hoursWorked: 9, dayHours: 9, nightHours: 0 })
    expect(result.overtimeDayHours).toBe(1)
    expect(result.overtimeNightHours).toBe(0)
  })

  it('10h trabajadas → 2h extras (máximo diario)', () => {
    const result = calculateOvertimeHours({ hoursWorked: 10, dayHours: 10, nightHours: 0 })
    expect(result.overtimeDayHours).toBe(2)
    expect(result.overtimeNightHours).toBe(0)
  })

  it('8h trabajadas → sin extras', () => {
    const result = calculateOvertimeHours({ hoursWorked: 8, dayHours: 8, nightHours: 0 })
    expect(result.overtimeDayHours).toBe(0)
    expect(result.overtimeNightHours).toBe(0)
  })

  it('12h (11 diurnas + 1 nocturna) → extras repartidas proporcionalmente', () => {
    const result = calculateOvertimeHours({ hoursWorked: 12, dayHours: 11, nightHours: 1 })
    expect(result.overtimeDayHours).toBeCloseTo(3.67, 2)
    expect(result.overtimeNightHours).toBeCloseTo(0.33, 2)
  })
})

describe('validateDailyLimit', () => {
  it('con 2.5h extras en el día → supera el límite', async () => {
    mockFindLean([
      { overtimeDayHours: 2.5, overtimeNightHours: 0 },
    ])
    const result = await validateDailyLimit('emp1', new Date('2026-08-26T08:00:00'))
    expect(result.exceeded).toBe(true)
  })

  it('con 1h extra en el día → hay cupo', async () => {
    mockFindLean([{ overtimeDayHours: 1, overtimeNightHours: 0 }])
    const result = await validateDailyLimit('emp1', new Date('2026-08-26T08:00:00'))
    expect(result.exceeded).toBe(false)
  })
})

describe('validateWeeklyLimit', () => {
  it('con 12.5h extras en la semana → supera el límite', async () => {
    mockFindLean([
      { overtimeDayHours: 6, overtimeNightHours: 0 },
      { overtimeDayHours: 6.5, overtimeNightHours: 0 },
    ])
    const result = await validateWeeklyLimit('emp1', new Date('2026-08-26T08:00:00'))
    expect(result.exceeded).toBe(true)
  })

  it('con 11h extras en la semana → dentro del límite', async () => {
    mockFindLean([
      { overtimeDayHours: 6, overtimeNightHours: 0 },
      { overtimeDayHours: 5, overtimeNightHours: 0 },
    ])
    const result = await validateWeeklyLimit('emp1', new Date('2026-08-26T08:00:00'))
    expect(result.exceeded).toBe(false)
  })
})

describe('generateAlert', () => {
  it('crea una alerta del módulo attendance', async () => {
    await generateAlert({
      employeeId: 'emp1',
      type: 'overtime_limit',
      message: 'Límite semanal superado',
    })
    expect(Alert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        module: 'attendance',
        employee: 'emp1',
        message: 'Límite semanal superado',
      }),
    )
  })
})
