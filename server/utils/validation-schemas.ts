import { z } from 'zod'
import { ROLES } from '~~/shared/auth'
import {
  ABSENCE_STATUS,
  ABSENCE_TYPE_LIST,
  type AbsenceStatus,
  type AbsenceType,
} from '~~/shared/absence'
import { parseDateOnly } from '~~/shared/utils/datetime-helpers'

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/

/**
 * Fecha calendario (YYYY-MM-DD) sin hora. Se almacena como mediodía UTC
 * (T12:00:00.000Z) para que la conversión a zona local no retroceda el día
 * (evita el desfase de medianoche UTC en Colombia, UTC-5).
 */
export const dateOnlySchema = z
  .string()
  .regex(DATE_ONLY_REGEX, 'Fecha inválida (formato YYYY-MM-DD)')
  .transform((value) => parseDateOnly(value) as Date)

export const emailSchema = z.string().email('Correo electrónico inválido')

export const passwordSchema = z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')

export const roleSchema = z.enum([ROLES.ADMIN, ROLES.MANAGER, ROLES.HR, ROLES.EMPLOYEE])

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'La contraseña es requerida'),
})

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido'),
  email: emailSchema,
  password: passwordSchema,
})

export const userCreateSchema = registerSchema.extend({
  role: roleSchema.default(ROLES.EMPLOYEE),
  active: z.boolean().default(true),
  password: passwordSchema.optional(),
  invite: z.boolean().default(false),
  // Ficha de empleado opcional al crear un usuario con rol employee.
  employee: z
    .object({
      firstName: z.string().trim().min(1, 'El nombre es requerido'),
      lastName: z.string().trim().min(1, 'El apellido es requerido'),
      document: z.string().trim().min(4, 'Documento inválido'),
      position: z.string().trim().min(1, 'El cargo es requerido'),
      baseSalary: z.number().positive('El salario base debe ser mayor a 0'),
      contractType: z
        .enum(['indefinite', 'fixed', 'work_labor', 'intern'])
        .default('indefinite'),
      hireDate: dateOnlySchema.optional(),
    })
    .optional(),
})

export const inviteSchema = z.object({
  token: z.string().min(1, 'El token de invitación es requerido'),
  password: passwordSchema,
})

export const userUpdateSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido').optional(),
  email: emailSchema.optional(),
  password: passwordSchema.optional(),
  role: roleSchema.optional(),
  active: z.boolean().optional(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
  newPassword: passwordSchema,
})

export const mongoIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID inválido')

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  role: z.string().trim().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (formato HH:mm)')

export const companyUpdateSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido').optional(),
  nit: z.string().trim().min(5, 'NIT inválido').optional(),
  address: z.string().trim().min(1, 'La dirección es requerida').optional(),
  taxRegime: z.enum(['simplified', 'common']).optional(),
  workSchedule: z
    .object({
      maxWeeklyHours: z.number().int().min(1).max(168).optional(),
      minDailyHours: z.number().int().min(1).max(24).optional(),
      maxDailyHours: z.number().int().min(1).max(24).optional(),
      nightShiftStart: timeSchema.optional(),
      nightShiftEnd: timeSchema.optional(),
    })
    .optional(),
  absencePolicies: z
    .object({
      maxDaysPerYear: z.record(z.string(), z.number().int().min(0)).optional(),
      employerPaidIncapacidadDays: z.number().int().min(0).optional(),
      restDaySurchargeOverride: z.number().min(0).max(2).nullable().optional(),
      requireSupportDocument: z.boolean().optional(),
    })
    .optional(),
})

export const legalParamsSchema = z.object({
  uvtValue: z.number().positive('El valor UVT debe ser mayor a 0'),
  minimumWage: z
    .number()
    .positive('El salario mínimo es requerido'),
  transportAllowance: z
    .number()
    .nonnegative('El auxilio de transporte es requerido'),
  withholdingRates: z
    .array(
      z.object({
        from: z.number().nonnegative(),
        to: z.number().positive(),
        percentage: z.number().min(0).max(100),
      }),
    )
    .default([]),
  healthPercentages: z.object({
    employee: z.number().min(0).max(100),
    employer: z.number().min(0).max(100),
  }),
  pensionPercentages: z.object({
    employee: z.number().min(0).max(100),
    employer: z.number().min(0).max(100),
  }),
  nightSurchargePercentage: z.number().min(0).max(1).default(0.35),
  overtimeDayPercentage: z.number().min(0).max(1).default(0.25),
  overtimeNightPercentage: z.number().min(0).max(1).default(0.75),
  arlRiskClass: z.number().int().min(1).max(5).default(1),
  arlRates: z
    .record(z.string(), z.number().min(0).max(1))
    .default({
      '1': 0.00522,
      '2': 0.01044,
      '3': 0.02436,
      '4': 0.0435,
      '5': 0.0696,
    }),
  parafiscales: z
    .object({
      sena: z.number().min(0).max(1).default(0.02),
      icbf: z.number().min(0).max(1).default(0.03),
      compensationFund: z.number().min(0).max(1).default(0.04),
    })
    .default({ sena: 0.02, icbf: 0.03, compensationFund: 0.04 }),
  incapacidadComunDailyPercent: z.number().min(0).max(1).default(2 / 3),
  employerPaidIncapacidadDays: z.number().int().min(0).default(2),
  baseHoursPerMonth: z.number().int().min(1).default(240),
  validFrom: dateOnlySchema,
})

/**
 * Modo de cuenta al crear/vincular el empleado (patrón de bis-sw-01):
 * - none: ficha sin usuario.
 * - link: vincular un usuario existente con rol employee.
 * - create: crear el usuario en el acto (rol employee) y vincularlo.
 */
export const employeeAccountSchema = z.object({
  accountMode: z.enum(['none', 'link', 'create']).default('link'),
  userId: mongoIdSchema.optional(),
  createEmail: emailSchema.optional(),
  createPassword: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .optional(),
})

export const employeeCreateSchema = employeeAccountSchema.extend({
  document: z.string().trim().min(4, 'Documento inválido'),
  firstName: z.string().trim().min(1, 'El nombre es requerido'),
  lastName: z.string().trim().min(1, 'El apellido es requerido'),
  email: emailSchema.optional(),
  hireDate: dateOnlySchema.optional(),
  contractType: z
    .enum(['indefinite', 'fixed', 'work_labor', 'intern'])
    .default('indefinite'),
  baseSalary: z.number().positive('El salario base debe ser mayor a 0'),
  arlRiskClass: z.number().int().min(1).max(5).default(1),
  position: z.string().trim().min(1, 'El cargo es requerido'),
  assignedShift: mongoIdSchema.optional(),
  active: z.boolean().default(true),
})

export const employeeUpdateSchema = z.object({
  userId: mongoIdSchema.optional(),
  unlinkUser: z.boolean().default(false),
  document: z.string().trim().min(4, 'Documento inválido').optional(),
  firstName: z.string().trim().min(1, 'El nombre es requerido').optional(),
  lastName: z.string().trim().min(1, 'El apellido es requerido').optional(),
  email: emailSchema.optional(),
  hireDate: dateOnlySchema.optional(),
  contractType: z
    .enum(['indefinite', 'fixed', 'work_labor', 'intern'])
    .optional(),
  baseSalary: z.number().positive('El salario base debe ser mayor a 0').optional(),
  arlRiskClass: z.number().int().min(1).max(5).optional(),
  position: z.string().trim().min(1, 'El cargo es requerido').optional(),
  assignedShift: mongoIdSchema.optional(),
  active: z.boolean().optional(),
})

export const employeeAssignShiftSchema = z.object({
  assignedShift: mongoIdSchema,
})

export const attendanceCreateSchema = z
  .object({
    employeeId: mongoIdSchema,
    clockIn: z.coerce.date('Fecha de entrada inválida'),
    clockOut: z.coerce.date('Fecha de salida inválida'),
    observations: z.string().trim().optional(),
  })
  .refine((data) => data.clockOut > data.clockIn, {
    message: 'La salida debe ser posterior a la entrada',
    path: ['clockOut'],
  })

export const attendanceUpdateSchema = z
  .object({
    clockIn: z.coerce.date('Fecha de entrada inválida').optional(),
    clockOut: z.coerce.date('Fecha de salida inválida').optional(),
    observations: z.string().trim().optional(),
  })
  .refine(
    (data) => !(data.clockIn && data.clockOut && data.clockOut <= data.clockIn),
    {
      message: 'La salida debe ser posterior a la entrada',
      path: ['clockOut'],
    },
  )

export const attendanceStatusSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  observations: z.string().trim().optional(),
})

export const absenceTypeSchema = z.enum(
  ABSENCE_TYPE_LIST as [AbsenceType, ...AbsenceType[]],
)

export const absenceStatusSchema = z.enum([
  ABSENCE_STATUS.PENDING,
  ABSENCE_STATUS.APPROVED,
  ABSENCE_STATUS.REJECTED,
] as [AbsenceStatus, AbsenceStatus, AbsenceStatus])

export const absenceCreateSchema = z
  .object({
    employeeId: mongoIdSchema,
    type: absenceTypeSchema,
    startDate: dateOnlySchema,
    endDate: dateOnlySchema,
    scheduledRestDate: z.coerce
      .date('Fecha programada de descanso inválida')
      .optional()
      .nullable(),
    supportDocument: z.string().trim().optional(),
    observations: z.string().trim().optional(),
    status: absenceStatusSchema.optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'La fecha final debe ser posterior o igual a la inicial',
    path: ['endDate'],
  })

export const absenceUpdateSchema = z
  .object({
    type: absenceTypeSchema.optional(),
    startDate: dateOnlySchema.optional(),
    endDate: dateOnlySchema.optional(),
    scheduledRestDate: z.coerce
      .date('Fecha programada de descanso inválida')
      .optional()
      .nullable(),
    supportDocument: z.string().trim().optional(),
    observations: z.string().trim().optional(),
  })
  .refine(
    (data) =>
      !(
        data.startDate &&
        data.endDate &&
        new Date(data.endDate).getTime() < new Date(data.startDate).getTime()
      ),
    {
      message: 'La fecha final debe ser posterior o igual a la inicial',
      path: ['endDate'],
    },
  )

export const absenceRejectSchema = z.object({
  reason: z.string().trim().min(1, 'El motivo del rechazo es requerido'),
})

export const absenceFilterSchema = paginationSchema.extend({
  employeeId: mongoIdSchema.optional(),
  type: absenceTypeSchema.optional(),
  status: absenceStatusSchema.optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
})

export const loanCreateSchema = z.object({
  employeeId: mongoIdSchema,
  description: z.string().trim().optional(),
  principal: z.number().positive('El capital debe ser mayor a 0'),
  interestRate: z.number().min(0).max(1).default(0),
  termMonths: z.number().int().min(1, 'Mínimo 1 mes').max(120),
  startDate: dateOnlySchema,
})

export const loanUpdateSchema = z.object({
  description: z.string().trim().optional(),
  status: z.enum(['active', 'paid', 'cancelled']).optional(),
})

export const loanPaymentSchema = z.object({
  amount: z.number().positive('El abono debe ser mayor a 0'),
})

export { z }

const shiftDaySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  ranges: z
    .array(
      z.object({
        startTime: timeSchema,
        endTime: timeSchema,
      }),
    )
    .min(1, 'Cada día debe tener al menos un rango de tiempo'),
  active: z.boolean().default(true),
})

export const shiftCreateSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido'),
  type: z.enum(['fixed', 'rotating']),
  days: z.array(shiftDaySchema).min(1, 'Define al menos un día'),
  description: z.string().trim().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido (formato #RRGGBB)')
    .optional(),
})

export const shiftUpdateSchema = shiftCreateSchema.partial()

export const shiftAssignSchema = z.object({
  employeeIds: z
    .array(mongoIdSchema)
    .min(1, 'Selecciona al menos un empleado'),
})

export const payrollCreateSchema = z
  .object({
    periodStart: dateOnlySchema,
    periodEnd: dateOnlySchema,
  })
  .refine((data) => data.periodEnd > data.periodStart, {
    message: 'El fin del período debe ser posterior al inicio',
    path: ['periodEnd'],
  })

export const payrollAdjustmentSchema = z.object({
  employeeId: mongoIdSchema,
  bonuses: z.number().min(0).optional(),
  commissions: z.number().min(0).optional(),
  garnishments: z.number().min(0).optional(),
  loans: z.number().min(0).optional(),
})

export const payrollUpdateSchema = z.object({
  observations: z.string().trim().optional(),
  employees: z.array(payrollAdjustmentSchema).optional(),
})

/**
 * Valida datos desconocidos contra un esquema zod y lanza un error 400
 * con el detalle de los issues si la validación falla.
 */
export function validateWithSchema<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Datos de entrada inválidos',
      data: result.error.flatten(),
    })
  }

  return result.data
}
