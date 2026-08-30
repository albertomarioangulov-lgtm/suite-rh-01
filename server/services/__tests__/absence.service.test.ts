import { afterEach, describe, expect, it, vi } from 'vitest'
import { ABSENCE_TYPES } from '~~/shared/absence'

vi.mock('~~/server/models/Absence', () => ({
  Absence: {
    create: vi.fn(),
    findOne: vi.fn(),
    countDocuments: vi.fn(),
    findApprovedByEmployeeAndRange: vi.fn(),
    findByEmployeeAndRange: vi.fn(),
  },
}))

vi.mock('~~/server/models/Employee', () => ({
  Employee: {
    findById: vi.fn(() => ({
      select: vi.fn(async () => ({
        diaDescanso: 0,
        baseSalary: 1_500_000,
      })),
    })),
  },
}))

vi.mock('~~/server/models/Company', () => ({
  Company: { getConfig: vi.fn() },
}))

vi.mock('~~/server/models/Attendance', () => ({
  Attendance: {
    find: vi.fn(),
  },
}))

import {
  calculateBusinessDays,
  calculateDescansoRecargo,
  calculateIncapacidadComun,
  calculateIncapacidadLaboral,
  calculatePermisoRemunerado,
  getAbsenceDays,
  getPaidAbsenceDaysForPeriod,
  shouldGiveCompensatoryRest,
} from '~~/server/services/absence.service'
import { Absence } from '~~/server/models/Absence'
import { Employee } from '~~/server/models/Employee'
import { Attendance } from '~~/server/models/Attendance'

afterEach(() => {
  vi.clearAllMocks()
})

describe('calculateBusinessDays', () => {
  it('cuenta lunes a sábado y excluye el domingo (dayOff=0)', () => {
    // 2026-08-01 es sábado y 2026-08-31 es lunes.
    const days = calculateBusinessDays('2026-08-01', '2026-08-31', 0)
    // 31 días de agosto 2026: 4 domingos + 1 sábado = 26 hábiles
    // (lunes a sábado, descanso domingo).
    expect(days).toBe(26)
  })

  it('respeta el día de descanso configurado (sábado, dayOff=6)', () => {
    // Semana del 2026-08-03 (lunes) al 2026-08-09 (domingo): con descanso
    // domingo son 6 hábiles (lun-sáb); con descanso sábado también 6
    // (dom-vie).
    expect(calculateBusinessDays('2026-08-03', '2026-08-09', 0)).toBe(6)
    expect(calculateBusinessDays('2026-08-03', '2026-08-09', 6)).toBe(6)
    // Con descanso viernes (dayOff=5): lun-jue + sáb + dom = 6.
    expect(calculateBusinessDays('2026-08-03', '2026-08-09', 5)).toBe(6)
    // Rango que no toca el descanso: miércoles a viernes = 3.
    expect(calculateBusinessDays('2026-08-05', '2026-08-07', 0)).toBe(3)
  })

  it('retorna 0 si el rango está invertido', () => {
    expect(calculateBusinessDays('2026-08-10', '2026-08-01', 0)).toBe(0)
  })
})

describe('getAbsenceDays', () => {
  it('permisos usan días hábiles', () => {
    expect(
      getAbsenceDays(ABSENCE_TYPES.PERMISO_MEDICO, '2026-08-03', '2026-08-09', 0),
    ).toBe(6)
  })

  it('incapacidades y vacaciones usan días de calendario', () => {
    expect(
      getAbsenceDays(ABSENCE_TYPES.INCAPACIDAD_COMUN, '2026-08-03', '2026-08-09', 0),
    ).toBe(7)
    expect(
      getAbsenceDays(ABSENCE_TYPES.VACACIONES, '2026-08-03', '2026-08-09', 0),
    ).toBe(7)
  })
})

describe('calculateIncapacidadComun', () => {
  it('empresa paga los 2 primeros días y EPS el resto (66,67% diario)', () => {
    const result = calculateIncapacidadComun(1_500_000, 10)
    expect(result.employerPaidDays).toBe(2)
    expect(result.epsPaidDays).toBe(8)
    expect(result.employerValue).toBe(round2(2 * (1_500_000 / 30) * (2 / 3)))
    expect(result.epsValue).toBe(round2(8 * (1_500_000 / 30) * (2 / 3)))
  })

  it('con incapacidad de 1 día, la empresa paga todo', () => {
    const result = calculateIncapacidadComun(1_500_000, 1)
    expect(result.employerPaidDays).toBe(1)
    expect(result.epsPaidDays).toBe(0)
    expect(result.epsValue).toBe(0)
  })
})

describe('calculateIncapacidadLaboral', () => {
  it('ARL cubre el 100% desde el día 1', () => {
    const result = calculateIncapacidadLaboral(1_500_000, 5)
    expect(result.employerPaidDays).toBe(0)
    expect(result.arlPaidDays).toBe(5)
    expect(result.arlValue).toBe(250_000)
  })
})

describe('calculateDescansoRecargo', () => {
  it('aplica 80% antes de jul/2026, 90% hasta jun/2027 y 100% después', () => {
    const before = calculateDescansoRecargo('2026-06-30', 1_500_000)
    expect(before.rate).toBe(0.8)
    expect(before.surchargeValue).toBe(40_000)

    const transition = calculateDescansoRecargo('2026-07-01', 1_500_000)
    expect(transition.rate).toBe(0.9)

    const after = calculateDescansoRecargo('2027-07-01', 1_500_000)
    expect(after.rate).toBe(1)
    expect(after.surchargeValue).toBe(50_000)
  })

  it('permite override de la empresa', () => {
    const result = calculateDescansoRecargo('2026-08-01', 1_500_000, 1)
    expect(result.rate).toBe(1)
  })
})

describe('calculatePermisoRemunerado', () => {
  it('permiso médico es remunerado y cuenta días', () => {
    const result = calculatePermisoRemunerado(ABSENCE_TYPES.PERMISO_MEDICO, 2)
    expect(result.remunerado).toBe(true)
    expect(result.unpaidDays).toBe(0)
    expect(result.countedDays).toBe(2)
  })

  it('permiso sin remunerar descuenta días', () => {
    const result = calculatePermisoRemunerado(ABSENCE_TYPES.SIN_REMUNERAR, 3)
    expect(result.remunerado).toBe(false)
    expect(result.unpaidDays).toBe(3)
    expect(result.countedDays).toBe(0)
  })

  it('detecta exceso sobre la política anual', () => {
    const result = calculatePermisoRemunerado(ABSENCE_TYPES.PERMISO_MEDICO, 3, 4)
    expect(result.exceedsPolicy).toBe(true)
    expect(result.remainingDays).toBe(1)
  })
})

describe('shouldGiveCompensatoryRest', () => {
  it('sin domingos trabajados no genera compensatorio', async () => {
    ;(Attendance.find as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      lean: vi.fn(async () => []),
    }))

    const result = await shouldGiveCompensatoryRest('emp1', 8, 2026)
    expect(result.restDaysWorked).toBe(0)
    expect(result.mandatory).toBe(false)
    expect(result.optional).toBe(false)
  })

  it('con 3 o más domingos trabajados el compensatorio es obligatorio', async () => {
    ;(Attendance.find as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      lean: vi.fn(async () => [
        { date: new Date(Date.UTC(2026, 7, 2)) },
        { date: new Date(Date.UTC(2026, 7, 9)) },
        { date: new Date(Date.UTC(2026, 7, 16)) },
      ]),
    }))

    const result = await shouldGiveCompensatoryRest('emp1', 8, 2026)
    expect(result.restDaysWorked).toBe(3)
    expect(result.mandatory).toBe(true)
    expect(result.optional).toBe(false)
    expect(result.suggestedRestDate).toBe('2026-08-23')
  })
})

describe('getPaidAbsenceDaysForPeriod', () => {
  it('suma días remunerados y valores de incapacidades aprobadas', async () => {
    ;(Absence.findApprovedByEmployeeAndRange as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        type: ABSENCE_TYPES.PERMISO_MEDICO,
        days: 2,
        companyPaidValue: 0,
        epsValue: 0,
        arlValue: 0,
      },
      {
        type: ABSENCE_TYPES.INCAPACIDAD_COMUN,
        days: 5,
        companyPaidValue: 66_666.67,
        epsValue: 66_666.67,
        arlValue: 0,
      },
      {
        type: ABSENCE_TYPES.SIN_REMUNERAR,
        days: 1,
        companyPaidValue: 0,
        epsValue: 0,
        arlValue: 0,
      },
    ])

    const result = await getPaidAbsenceDaysForPeriod(
      'emp1',
      new Date('2026-08-01'),
      new Date('2026-08-31'),
    )
    expect(result.paidDays).toBe(2)
    expect(result.unpaidDays).toBe(1)
    expect(result.companyPaidValue).toBe(66_666.67)
    expect(result.epsValue).toBe(66_666.67)
  })
})

const round2 = (value: number) => Math.round(value * 100) / 100
