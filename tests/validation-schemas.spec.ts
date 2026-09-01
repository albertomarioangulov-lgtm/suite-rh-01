import { describe, expect, it } from 'vitest'
import {
  attendanceCreateSchema,
  attendanceUpdateSchema,
  companyUpdateSchema,
  inviteSchema,
  legalParamsSchema,
  loginSchema,
  mongoIdSchema,
  paginationSchema,
  registerSchema,
  shiftCreateSchema,
  shiftUpdateSchema,
  userCreateSchema,
  userUpdateSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'
import { ROLES } from '~~/shared/auth'

describe('loginSchema', () => {
  it('acepta credenciales válidas', () => {
    const result = loginSchema.safeParse({
      email: 'user@test.com',
      password: 'clave123',
    })
    expect(result.success).toBe(true)
  })

  it('rechaza email inválido y contraseña vacía', () => {
    const result = loginSchema.safeParse({ email: 'mal', password: '' })
    expect(result.success).toBe(false)
  })
})

describe('registerSchema', () => {
  it('recorta el nombre', () => {
    const result = registerSchema.safeParse({
      name: '  Juan Pérez  ',
      email: 'juan@test.com',
      password: 'clave123',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Juan Pérez')
    }
  })
})

describe('userCreateSchema', () => {
  it('aplica defaults de role y active', () => {
    const result = userCreateSchema.safeParse({
      name: 'Ana',
      email: 'ana@test.com',
      password: 'clave123',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.role).toBe(ROLES.EMPLOYEE)
      expect(result.data.active).toBe(true)
    }
  })
})

describe('userUpdateSchema', () => {
  it('permite campos opcionales', () => {
    const result = userUpdateSchema.safeParse({ name: 'Nuevo nombre' })
    expect(result.success).toBe(true)
  })

  it('rechaza passwords cortas', () => {
    const result = userUpdateSchema.safeParse({ password: '123' })
    expect(result.success).toBe(false)
  })
})

describe('mongoIdSchema', () => {
  it('acepta ObjectIds de 24 hex', () => {
    expect(mongoIdSchema.safeParse('64b0a1b2c3d4e5f6a7b8c9d0').success).toBe(true)
  })

  it('rechaza ids malformados', () => {
    expect(mongoIdSchema.safeParse('abc').success).toBe(false)
    expect(mongoIdSchema.safeParse('').success).toBe(false)
  })
})

describe('paginationSchema', () => {
  it('coerce page/limit desde strings y aplica defaults', () => {
    const result = paginationSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(1)
      expect(result.data.limit).toBe(20)
    }
  })

  it('rechaza limit mayor a 100', () => {
    expect(paginationSchema.safeParse({ limit: '500' }).success).toBe(false)
  })

  it('valida sortOrder', () => {
    expect(paginationSchema.safeParse({ sortOrder: 'desc' }).success).toBe(true)
    expect(paginationSchema.safeParse({ sortOrder: 'sideways' }).success).toBe(false)
  })
})

describe('validateWithSchema', () => {
  it('lanza error 400 con datos inválidos', () => {
    try {
      validateWithSchema(loginSchema, { email: 'mal', password: '' })
      expect.unreachable()
    } catch (error) {
      const apiError = error as { statusCode?: number; data?: unknown }
      expect(apiError.statusCode).toBe(400)
      expect(apiError.data).toBeDefined()
    }
  })
})

describe('inviteSchema', () => {
  it('acepta token y contraseña válidos', () => {
    expect(inviteSchema.safeParse({ token: 'abc123', password: 'clave123' }).success).toBe(true)
  })

  it('rechaza token vacío o contraseña corta', () => {
    expect(inviteSchema.safeParse({ token: '', password: 'clave123' }).success).toBe(false)
    expect(inviteSchema.safeParse({ token: 'abc', password: '123' }).success).toBe(false)
  })
})

describe('companyUpdateSchema', () => {
  it('acepta una actualización parcial válida', () => {
    expect(
      companyUpdateSchema.safeParse({
        name: 'Mi Empresa SAS',
        taxRegime: 'common',
        workSchedule: { maxWeeklyHours: 42, nightShiftStart: '19:00' },
      }).success,
    ).toBe(true)
  })

  it('rechaza horas malformadas', () => {
    expect(
      companyUpdateSchema.safeParse({
        workSchedule: { nightShiftStart: '25:99' },
      }).success,
    ).toBe(false)
  })
})

describe('legalParamsSchema', () => {
  const valid = {
    uvtValue: 47000,
    minimumWage: 1750905,
    transportAllowance: 249095,
    healthPercentages: { employee: 4, employer: 8.5 },
    pensionPercentages: { employee: 4, employer: 12 },
    validFrom: '2026-01-01',
  }

  it('aplica defaults de recargos y riesgo ARL', () => {
    const result = legalParamsSchema.safeParse(valid)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.nightSurchargePercentage).toBe(0.35)
      expect(result.data.arlRiskClass).toBe(1)
      expect(result.data.withholdingRates).toEqual([])
    }
  })

  it('rechaza UVT no positivo y fechas inválidas', () => {
    expect(legalParamsSchema.safeParse({ ...valid, uvtValue: -5 }).success).toBe(false)
    expect(legalParamsSchema.safeParse({ ...valid, validFrom: 'no-es-fecha' }).success).toBe(false)
  })
})

describe('attendanceCreateSchema', () => {
  it('acepta un registro válido', () => {
    expect(
      attendanceCreateSchema.safeParse({
        employeeId: '64b0a1b2c3d4e5f6a7b8c9d0',
        clockIn: '2026-08-26T08:00:00',
        clockOut: '2026-08-26T18:00:00',
      }).success,
    ).toBe(true)
  })

  it('rechaza salida anterior a la entrada', () => {
    expect(
      attendanceCreateSchema.safeParse({
        employeeId: '64b0a1b2c3d4e5f6a7b8c9d0',
        clockIn: '2026-08-26T18:00:00',
        clockOut: '2026-08-26T08:00:00',
      }).success,
    ).toBe(false)
  })
})

describe('attendanceUpdateSchema', () => {
  it('permite actualizaciones parciales', () => {
    expect(
      attendanceUpdateSchema.safeParse({ observations: 'Permiso' }).success,
    ).toBe(true)
  })
})

describe('shiftCreateSchema', () => {
  const valid = {
    name: 'Turno Mañana',
    type: 'fixed',
    days: [
      {
        dayOfWeek: 1,
        ranges: [
          { startTime: '08:00', endTime: '12:00' },
          { startTime: '13:00', endTime: '17:00' },
        ],
      },
    ],
  }

  it('acepta un turno con dos rangos', () => {
    expect(shiftCreateSchema.safeParse(valid).success).toBe(true)
  })

  it('rechaza horas malformadas', () => {
    expect(
      shiftCreateSchema.safeParse({
        ...valid,
        days: [
          {
            dayOfWeek: 1,
            ranges: [{ startTime: '25:00', endTime: '17:00' }],
          },
        ],
      }).success,
    ).toBe(false)
  })

  it('rechaza días sin rangos', () => {
    expect(
      shiftCreateSchema.safeParse({
        ...valid,
        days: [{ dayOfWeek: 1, ranges: [] }],
      }).success,
    ).toBe(false)
  })
})

describe('shiftUpdateSchema', () => {
  it('permite actualización parcial', () => {
    expect(shiftUpdateSchema.safeParse({ name: 'Turno Noche' }).success).toBe(
      true,
    )
  })
})
