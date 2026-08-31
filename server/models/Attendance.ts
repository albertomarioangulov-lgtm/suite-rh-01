import mongoose from 'mongoose'
import type { InferSchemaType } from 'mongoose'
import { Company } from '~~/server/models/Company'
import { Employee } from '~~/server/models/Employee'
import {
  getWeekRange,
  splitDayNightHours,
  splitOvertimeFromEnd,
  sumHours,
} from '~~/shared/utils/datetime-helpers'

const { Schema, model, models } = mongoose

/** Jornada ordinaria diaria según Ley 2101 (Colombia). */
export const REGULAR_DAILY_HOURS = 8
/** Recargo nocturno legal (35%). */
export const NIGHT_SURCHARGE_RATE = 0.35

const AttendanceSchema = new Schema(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    date: { type: Date, required: true },
    clockIn: { type: Date, required: true },
    clockOut: { type: Date, required: true },
    hoursWorked: { type: Number, default: 0 },
    dayHours: { type: Number, default: 0 },
    nightHours: { type: Number, default: 0 },
    overtimeDayHours: { type: Number, default: 0 },
    overtimeNightHours: { type: Number, default: 0 },
    /** Recargo nocturno en horas: nightHours * 35%. */
    nightSurcharge: { type: Number, default: 0 },
    // El modelo Shift llegará en una fase futura; se guarda el id.
    assignedShift: { type: Schema.Types.ObjectId, ref: 'Shift', default: null },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    observations: { type: String, trim: true },
    recordedBy: { ref: 'User', type: Schema.Types.ObjectId },
  },
  { timestamps: true, versionKey: false },
)

AttendanceSchema.index({ employee: 1, date: 1 }, { unique: true })
AttendanceSchema.index({ tenantId: 1, date: -1 })
AttendanceSchema.index({ tenantId: 1, date: 1, employee: 1 })
AttendanceSchema.index({ status: 1 })

/**
 * Hook: calcula horas trabajadas, diurnas/nocturnas, extras y recargo usando
 * la configuración de la empresa (ventana nocturna). También rechaza
 * registros duplicados del mismo empleado en la misma fecha.
 * OJO: si el typecheck falla con `this.constructor`, castear a mongoose.Model.
 */
AttendanceSchema.pre('save', async function () {
  if (!this.clockIn || !this.clockOut) {
    throw new Error('Los horarios de entrada y salida son requeridos')
  }
  if (this.clockOut <= this.clockIn) {
    throw new Error('La salida debe ser posterior a la entrada')
  }

  const company = await Company.getConfig()
  const schedule = company?.workSchedule ?? {
    nightShiftStart: '19:00',
    nightShiftEnd: '06:00',
  }
  const nightStart = schedule.nightShiftStart || '19:00'
  const nightEnd = schedule.nightShiftEnd || '06:00'

  const { dayHours, nightHours } = splitDayNightHours(
    this.clockIn,
    this.clockOut,
    nightStart,
    nightEnd,
  )
  const { overtimeDayHours, overtimeNightHours } = splitOvertimeFromEnd(
    this.clockIn,
    this.clockOut,
    REGULAR_DAILY_HOURS,
    nightStart,
    nightEnd,
  )

  this.hoursWorked = Math.round((dayHours + nightHours) * 100) / 100
  this.dayHours = dayHours
  this.nightHours = nightHours
  this.overtimeDayHours = overtimeDayHours
  this.overtimeNightHours = overtimeNightHours
  this.nightSurcharge = Math.round(nightHours * NIGHT_SURCHARGE_RATE * 100) / 100

  if (!this.tenantId && this.employee) {
    const employee = await Employee.findById(this.employee)
    if (employee) this.tenantId = employee.tenantId
  }

  const AttendanceModel = this.constructor as unknown as mongoose.Model<IAttendance>
  const duplicate = await AttendanceModel.findOne({
    employee: this.employee,
    date: this.date,
    _id: { $ne: this._id },
  })
  if (duplicate) {
    throw new Error('Ya existe un registro de asistencia para este empleado en esa fecha')
  }
})

/**
 * Resumen semanal de un empleado entre dos fechas.
 */
AttendanceSchema.statics.getWeeklySummary = async function (
  employeeId: string,
  start: Date,
  end: Date,
) {
  const records = await this.find({
    employee: employeeId,
    date: { $gte: start, $lte: end },
  }).lean()
  return summarizeRecords(records)
}

/**
 * Resumen de asistencia para cualquier rango de fechas (usado por nómina).
 */
AttendanceSchema.statics.getRangeSummary = AttendanceSchema.statics.getWeeklySummary

/**
 * Resumen mensual de un empleado (mes 1-12, año).
 */
AttendanceSchema.statics.getMonthlySummary = async function (
  employeeId: string,
  month: number,
  year: number,
) {
  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59))
  const records = await this.find({
    employee: employeeId,
    date: { $gte: start, $lte: end },
  }).lean()
  return summarizeRecords(records)
}

/**
 * Valida límites legales de horas extras (2h diarias, 12h semanales).
 * `excludeId` evita contar el registro que se está editando.
 */
AttendanceSchema.statics.validateOvertimeLimit = async function (
  employeeId: string,
  date: Date,
  excludeId?: string,
) {
  const [weekStart, weekEnd] = getWeekRange(date)
  const sameDay = await this.findOne({
    employee: employeeId,
    date: { $gte: new Date(date).setHours(0, 0, 0, 0), $lte: new Date(date).setHours(23, 59, 59, 999) },
    _id: { $ne: excludeId },
  }).lean()
  const week = await this.find({
    employee: employeeId,
    date: { $gte: weekStart, $lte: weekEnd },
    _id: { $ne: excludeId },
  }).lean()

  const dailyOvertime =
    (sameDay?.overtimeDayHours ?? 0) + (sameDay?.overtimeNightHours ?? 0)
  const weeklyOvertime = sumHours(
    week.map((r) => r.overtimeDayHours + r.overtimeNightHours),
  )
  const DAILY_LIMIT = 2
  const WEEKLY_LIMIT = 12

  return {
    dailyOvertime,
    weeklyOvertime,
    dailyLimit: DAILY_LIMIT,
    weeklyLimit: WEEKLY_LIMIT,
    dailyExceeded: dailyOvertime > DAILY_LIMIT,
    weeklyExceeded: weeklyOvertime > WEEKLY_LIMIT,
  }
}

const summarizeRecords = (records: Array<Record<string, any>>) => ({
  days: records.length,
  hoursWorked: Math.round(sumHours(records.map((r) => r.hoursWorked)) * 100) / 100,
  dayHours: Math.round(sumHours(records.map((r) => r.dayHours)) * 100) / 100,
  nightHours: Math.round(sumHours(records.map((r) => r.nightHours)) * 100) / 100,
  overtimeDayHours:
    Math.round(sumHours(records.map((r) => r.overtimeDayHours)) * 100) / 100,
  overtimeNightHours:
    Math.round(sumHours(records.map((r) => r.overtimeNightHours)) * 100) / 100,
  nightSurcharge:
    Math.round(sumHours(records.map((r) => r.nightSurcharge)) * 100) / 100,
})

export type IAttendance = InferSchemaType<typeof AttendanceSchema>

export type AttendanceModel = mongoose.Model<IAttendance> & {
  getWeeklySummary(
    employeeId: string,
    start: Date,
    end: Date,
  ): Promise<ReturnType<typeof summarizeRecords>>
  getRangeSummary(
    employeeId: string,
    start: Date,
    end: Date,
  ): Promise<ReturnType<typeof summarizeRecords>>
  getMonthlySummary(
    employeeId: string,
    month: number,
    year: number,
  ): Promise<ReturnType<typeof summarizeRecords>>
  validateOvertimeLimit(
    employeeId: string,
    date: Date,
    excludeId?: string,
  ): Promise<{
    dailyOvertime: number
    weeklyOvertime: number
    dailyLimit: number
    weeklyLimit: number
    dailyExceeded: boolean
    weeklyExceeded: boolean
  }>
}

export const Attendance = (models.Attendance ||
  model('Attendance', AttendanceSchema)) as AttendanceModel
