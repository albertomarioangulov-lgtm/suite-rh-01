import mongoose from 'mongoose'
import type { HydratedDocument, InferSchemaType, Model } from 'mongoose'
import dayjs from 'dayjs'
import { Company } from '~~/server/models/Company'
import { Employee } from '~~/server/models/Employee'

const { Schema, model, models } = mongoose

/**
 * Calcula las horas entre dos horas "HH:mm" manejando paso de medianoche
 * (ej. 22:00–06:00 = 8h).
 */
export const hoursBetweenTimes = (start: string, end: string): number => {
  const s = dayjs(`2000-01-01T${start}`)
  const e = dayjs(`2000-01-01T${end}`)
  if (!s.isValid() || !e.isValid()) return 0
  let diff = e.diff(s, 'hour', true)
  if (diff < 0) diff += 24
  return Math.round(diff * 100) / 100
}

const ShiftDaySchema = new Schema(
  {
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    /**
     * Rangos de tiempo del día (ej. jornada partida con almuerzo):
     * [{ startTime: '08:00', endTime: '12:00' }, { startTime: '13:00', endTime: '17:00' }]
     */
    ranges: {
      type: [
        {
          startTime: { type: String, required: true },
          endTime: { type: String, required: true },
        },
      ],
      default: [],
    },
    workHours: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { _id: false },
)

const ShiftSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['fixed', 'rotating'], required: true },
    days: { type: [ShiftDaySchema], default: [] },
    description: { type: String, trim: true },
    color: { type: String, default: '#1867C0' },
    active: { type: Boolean, default: true },
    createdBy: { ref: 'User', type: Schema.Types.ObjectId },
  },
  { timestamps: true, versionKey: false },
)

ShiftSchema.index({ tenantId: 1, name: 1 }, { unique: true })
ShiftSchema.index({ tenantId: 1, active: 1 })

/**
 * Hook: recalcula horas por día, valida rango diario (6-9h) y total semanal
 * (<=42h) según la configuración de la empresa, y exige 7 días en rotativos.
 */
ShiftSchema.pre('save', async function () {
  this.days = (this.days ?? []).map((day) => ({
    ...day,
    workHours: Math.round(
      (day.ranges ?? []).reduce(
        (acc, range) =>
          acc + Math.max(0, hoursBetweenTimes(range.startTime, range.endTime)),
        0,
      ) * 100,
    ) / 100,
  }))

  const company = await Company.getConfig()
  const schedule = company?.workSchedule ?? { minDailyHours: 6, maxDailyHours: 9, maxWeeklyHours: 42 }
  const minDaily = schedule.minDailyHours || 6
  const maxDaily = schedule.maxDailyHours || 9
  const maxWeekly = schedule.maxWeeklyHours || 42

  const activeDays = this.days.filter((day) => day.active)
  if (this.type === 'rotating' && activeDays.length !== 7) {
    throw new Error('Un turno rotativo debe definir los 7 días de la semana')
  }

  for (const day of activeDays) {
    if (day.workHours < minDaily || day.workHours > maxDaily) {
      throw new Error(
        `El día ${day.dayOfWeek} tiene ${day.workHours}h; debe estar entre ${minDaily} y ${maxDaily}h`,
      )
    }
  }

  const weekly = activeDays.reduce((acc, day) => acc + (day.workHours || 0), 0)
  if (weekly > maxWeekly) {
    throw new Error(`El total semanal (${weekly}h) supera el máximo de ${maxWeekly}h`)
  }
})

/** Turnos activos de una empresa. */
ShiftSchema.statics.findActiveByCompany = function (companyId: string) {
  return this.find({ tenantId: companyId, active: true }).sort({ name: 1 })
}

/** Turno asignado a un empleado. */
ShiftSchema.statics.getShiftByEmployee = async function (employeeId: string) {
  const employee = await Employee.findById(employeeId).select('assignedShift')
  if (!employee?.assignedShift) return null
  return this.findById(employee.assignedShift)
}

export type IShift = InferSchemaType<typeof ShiftSchema>
export type IShiftDay = InferSchemaType<typeof ShiftDaySchema>

export interface IShiftStatics {
  findActiveByCompany(
    companyId: string,
  ): Promise<HydratedDocument<IShift>[]>
  getShiftByEmployee(
    employeeId: string,
  ): Promise<HydratedDocument<IShift> | null>
}

export type ShiftModel = Model<
  IShift,
  Record<string, never>,
  Record<string, never>
> &
  IShiftStatics

export const Shift = (models.Shift || model('Shift', ShiftSchema)) as ShiftModel
