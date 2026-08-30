import { Alert } from '~~/server/models/Alert'
import { Company } from '~~/server/models/Company'
import { Employee } from '~~/server/models/Employee'
import { hoursBetweenTimes } from '~~/server/models/Shift'

const DEFAULT_SCHEDULE = {
  minDailyHours: 6,
  maxDailyHours: 9,
  maxWeeklyHours: 42,
}

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/** Convierte un rango a minutos, tratando el cruce de medianoche (end <= start). */
const rangeAsMinutes = (range: { startTime: string; endTime: string }) => {
  let end = toMinutes(range.endTime)
  const start = toMinutes(range.startTime)
  if (end <= start) end += 24 * 60
  return { start, end }
}

export const getCompanySchedule = async () => {
  const company = await Company.getConfig()
  return {
    ...DEFAULT_SCHEDULE,
    ...(company?.workSchedule ?? {}),
  }
}

/** Total de horas semanales de un arreglo de días. */
export const calculateWeeklyHours = (
  days: Array<{
    ranges?: Array<{ startTime: string; endTime: string }>
    active?: boolean
  }>,
) => {
  const active = days.filter((day) => day.active !== false)
  return (
    Math.round(
      active.reduce(
        (acc, day) =>
          acc +
          (day.ranges ?? []).reduce(
            (sum, range) =>
              sum + Math.max(0, hoursBetweenTimes(range.startTime, range.endTime)),
            0,
          ),
        0,
      ) * 100,
    ) / 100
  )
}

/**
 * Valida horas diarias (6-9h) y total semanal (<=42h) según la empresa.
 */
export const validateShiftHours = async (
  days: Array<{
    ranges?: Array<{ startTime: string; endTime: string }>
    active?: boolean
  }>,
) => {
  const schedule = await getCompanySchedule()
  const errors: string[] = []

  for (const day of days) {
    if (day.active === false) continue
    const ranges = day.ranges ?? []
    if (ranges.length === 0) {
      errors.push('Un día activo debe tener al menos un rango de tiempo')
      continue
    }

    // Formato y solapamiento entre rangos del mismo día.
    const sorted = [...ranges].sort((a, b) =>
      a.startTime.localeCompare(b.startTime),
    )
    let prevEnd = -1
    for (const range of sorted) {
      const { start, end } = rangeAsMinutes(range)
      if (end === start) {
        errors.push(`Rango inválido: ${range.startTime}–${range.endTime} (0 horas)`)
        continue
      }
      if (start < prevEnd) {
        errors.push(`Los rangos se solapan (${range.startTime})`)
      }
      prevEnd = Math.max(prevEnd, end)
    }

    const hours = Math.round(
      ranges.reduce(
        (acc, range) =>
          acc + Math.max(0, hoursBetweenTimes(range.startTime, range.endTime)),
        0,
      ) * 100,
    ) / 100
    if (hours < schedule.minDailyHours || hours > schedule.maxDailyHours) {
      errors.push(
        `Día con ${hours}h: debe estar entre ${schedule.minDailyHours} y ${schedule.maxDailyHours}h`,
      )
    }
    // Descanso implícito entre tramos: al menos 30 min entre rangos.
    for (let index = 1; index < sorted.length; index++) {
      const gap =
        rangeAsMinutes(sorted[index]).start - rangeAsMinutes(sorted[index - 1]).end
      if (gap > 0 && gap < 30) {
        errors.push(`Descanso entre tramos menor a 30 minutos`)
        break
      }
    }
  }

  const weeklyHours = calculateWeeklyHours(days)
  if (weeklyHours > schedule.maxWeeklyHours) {
    errors.push(`Total semanal ${weeklyHours}h supera el máximo de ${schedule.maxWeeklyHours}h`)
  }

  return { valid: errors.length === 0, errors, weeklyHours }
}

/** Empleados activos asignados a un turno. */
export const getAssignedEmployees = (shiftId: string) =>
  Employee.find({ assignedShift: shiftId, active: true })

/** Verifica si alguno de los empleados ya tiene OTRO turno asignado. */
export const checkEmployeeConflicts = async (
  shiftId: string,
  employeeIds: string[],
) => {
  const conflicts = await Employee.find({
    assignedShift: { $nin: [null, shiftId] },
    _id: { $in: employeeIds },
  }).select('firstName lastName')
  return conflicts
}

/** Genera una notificación (colección Alert, Módulo 6). */
export const generateShiftNotification = (message: string) =>
  Alert.create({ module: 'shift', type: 'info', message })
