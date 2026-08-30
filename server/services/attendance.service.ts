import {
  Attendance,
  NIGHT_SURCHARGE_RATE,
  REGULAR_DAILY_HOURS,
} from '~~/server/models/Attendance'
import { Alert } from '~~/server/models/Alert'
import { Company } from '~~/server/models/Company'
import { Employee } from '~~/server/models/Employee'
import { publishAlert } from '~~/server/utils/alert-stream'
import {
  getWeekRange,
  splitDayNightHours,
  splitOvertimeFromEnd,
  sumHours,
} from '~~/shared/utils/datetime-helpers'
const DEFAULT_SCHEDULE = {
  nightShiftStart: '19:00',
  nightShiftEnd: '06:00',
  maxDailyHours: 9,
  maxWeeklyHours: 42,
}

/**
 * Cálculo puro de horas (total, diurnas y nocturnas) según la ventana
 * nocturna de la empresa. Usado por pruebas unitarias y por el flujo real.
 */
export const calculateHours = (
  clockIn: Date | string,
  clockOut: Date | string,
  schedule: { nightShiftStart: string; nightShiftEnd: string } = DEFAULT_SCHEDULE,
) => {
  const nightStart = schedule.nightShiftStart || '19:00'
  const nightEnd = schedule.nightShiftEnd || '06:00'
  const { dayHours, nightHours } = splitDayNightHours(
    clockIn,
    clockOut,
    nightStart,
    nightEnd,
  )
  return {
    hoursWorked: Math.round((dayHours + nightHours) * 100) / 100,
    dayHours,
    nightHours,
  }
}

/**
 * Cálculo puro de horas extras: horas más allá de la jornada ordinaria
 * (8h por defecto), repartidas proporcionalmente entre diurna y nocturna.
 * Nota: el cálculo de producción usa `splitOvertimeFromEnd` (extras al final
 * del turno); esta función proporcional se ofrece para casos deterministas
 * en pruebas y reportes.
 */
export const calculateOvertimeHours = (
  input: { hoursWorked: number; dayHours: number; nightHours: number },
  regularHours = REGULAR_DAILY_HOURS,
) => {
  const overtime = Math.max(0, input.hoursWorked - regularHours)
  if (overtime <= 0) return { overtimeDayHours: 0, overtimeNightHours: 0 }
  const sum = input.dayHours + input.nightHours || 1
  return {
    overtimeDayHours:
      Math.round((input.dayHours / sum) * overtime * 100) / 100,
    overtimeNightHours:
      Math.round((input.nightHours / sum) * overtime * 100) / 100,
  }
}

export const getCompanySchedule = async () => {
  const company = await Company.getConfig()
  return {
    ...DEFAULT_SCHEDULE,
    ...(company?.workSchedule ?? {}),
  }
}

/**
 * Calcula los campos de asistencia (misma lógica que el hook del modelo)
 * para previsualización y para construcción de respuestas.
 */
export const calculateAttendanceFields = (
  clockIn: Date,
  clockOut: Date,
  schedule: { nightShiftStart: string; nightShiftEnd: string } = DEFAULT_SCHEDULE,
) => {
  const nightStart = schedule.nightShiftStart || '19:00'
  const nightEnd = schedule.nightShiftEnd || '06:00'
  const { dayHours, nightHours } = splitDayNightHours(
    clockIn,
    clockOut,
    nightStart,
    nightEnd,
  )
  const { overtimeDayHours, overtimeNightHours } = splitOvertimeFromEnd(
    clockIn,
    clockOut,
    REGULAR_DAILY_HOURS,
    nightStart,
    nightEnd,
  )
  return {
    hoursWorked: Math.round((dayHours + nightHours) * 100) / 100,
    dayHours,
    nightHours,
    overtimeDayHours,
    overtimeNightHours,
    nightSurcharge: Math.round(nightHours * NIGHT_SURCHARGE_RATE * 100) / 100,
  }
}

export const getWeeklyOvertime = async (employeeId: string, date: Date) => {
  const [weekStart, weekEnd] = getWeekRange(date)
  const records = await Attendance.find({
    employee: employeeId,
    date: { $gte: weekStart, $lte: weekEnd },
  }).lean()
  return sumHours(
    records.map((r) => r.overtimeDayHours + r.overtimeNightHours),
  )
}

export const validateDailyLimit = async (
  employeeId: string,
  date: Date,
  excludeId?: string,
) => {
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(23, 59, 59, 999)
  const records = await Attendance.find({
    employee: employeeId,
    date: { $gte: dayStart, $lte: dayEnd },
    _id: { $ne: excludeId },
  }).lean()
  const overtime = sumHours(
    records.map((r) => r.overtimeDayHours + r.overtimeNightHours),
  )
  return { overtime, limit: 2, exceeded: overtime > 2 }
}

export const validateWeeklyLimit = async (
  employeeId: string,
  date: Date,
  excludeId?: string,
) => {
  const [weekStart, weekEnd] = getWeekRange(date)
  const records = await Attendance.find({
    employee: employeeId,
    date: { $gte: weekStart, $lte: weekEnd },
    _id: { $ne: excludeId },
  }).lean()
  const overtime = sumHours(
    records.map((r) => r.overtimeDayHours + r.overtimeNightHours),
  )
  return { overtime, limit: 12, exceeded: overtime > 12 }
}

/** Genera una alerta (colección preparada para el Módulo 6). */
export const generateAlert = (entry: {
  employeeId?: string
  companyId?: string
  type?: 'overtime_limit' | 'info' | 'warning'
  message: string
}) => {
  const created = Alert.create({
    employee: entry.employeeId,
    tenantId: entry.companyId,
    module: 'attendance',
    type: entry.type ?? 'info',
    message: entry.message,
    alertKey: 'overtime_limit',
    targetRoles: ['admin', 'hr', 'manager'],
  })
  created.then((alert) =>
    publishAlert({
      _id: String(alert._id),
      employee: entry.employeeId,
      module: 'attendance',
      type: entry.type ?? 'info',
      message: entry.message,
      alertKey: 'overtime_limit',
      targetRoles: ['admin', 'hr', 'manager'],
      read: false,
      createdAt: new Date(),
    }),
  )
  return created
}

export const createAttendance = async (
  data: { employeeId: string; clockIn: Date; clockOut: Date; observations?: string },
  recordedBy?: string,
) => {
  const employee = await Employee.findById(data.employeeId)
  if (!employee) {
    throw createError({ statusCode: 400, message: 'El empleado no existe.' })
  }

  const schedule = await getCompanySchedule()
  const fields = calculateAttendanceFields(data.clockIn, data.clockOut, schedule)
  const daily = await validateDailyLimit(data.employeeId, data.clockIn)
  const weekly = await validateWeeklyLimit(data.employeeId, data.clockIn)

  try {
    const record = await Attendance.create({
      employee: employee._id,
      tenantId: employee.tenantId,
      date: data.clockIn,
      clockIn: data.clockIn,
      clockOut: data.clockOut,
      observations: data.observations,
      recordedBy,
    })

    // Alertas cuando se superan los límites legales de horas extras.
    const pending = await Attendance.findById(record._id)
    const pendingDaily = await validateDailyLimit(
      data.employeeId,
      data.clockIn,
      String(record._id),
    )
    const pendingWeekly = await validateWeeklyLimit(
      data.employeeId,
      data.clockIn,
      String(record._id),
    )
    if (pendingDaily.exceeded) {
      await generateAlert({
        employeeId: String(employee._id),
        companyId: String(employee.tenantId),
        type: 'overtime_limit',
        message: `Límite diario de horas extras superado (${pendingDaily.overtime.toFixed(1)}h de 2h)`,
      })
    }
    if (pendingWeekly.exceeded) {
      await generateAlert({
        employeeId: String(employee._id),
        companyId: String(employee.tenantId),
        type: 'overtime_limit',
        message: `Límite semanal de horas extras superado (${pendingWeekly.overtime.toFixed(1)}h de 12h)`,
      })
    }

    return { ...(pending?.toJSON() ?? record.toJSON()), ...fields, daily, weekly }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('Ya existe un registro')) {
      throw createError({
        statusCode: 409,
        message,
      })
    }
    throw error
  }
}
