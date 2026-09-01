/**
 * Helpers puros de asistencia (llegadas tardías).
 * Se usan en el modelo y son directamente testeables.
 */

/** Convierte 'HH:mm' a minutos desde medianoche. */
export const timeToMinutes = (time: string): number => {
  const [hour, minute] = time.split(':').map(Number)
  return (hour ?? 0) * 60 + (minute ?? 0)
}

/** Hora de inicio del primer rango del día ('' si el día no tiene turno). */
export const getShiftStartForDay = (
  days: Array<{
    dayOfWeek: number
    ranges?: Array<{ startTime?: string }>
  }>,
  weekday: number,
): string => {
  const day = days.find((entry) => entry.dayOfWeek === weekday)
  return day?.ranges?.[0]?.startTime ?? ''
}

/**
 * Calcula la llegada tarde comparando la hora de entrada con el inicio del
 * turno, usando la tolerancia configurada (minutos de gracia).
 * `lateMinutes` siempre es el retraso real; `isLate` es true solo cuando el
 * retraso supera la tolerancia.
 */
export const computeLateness = (
  clockIn: Date,
  shiftStartTime: string,
  toleranceMinutes = 5,
): { isLate: boolean; lateMinutes: number } => {
  if (!shiftStartTime) return { isLate: false, lateMinutes: 0 }
  const diff =
    clockIn.getHours() * 60 +
    clockIn.getMinutes() -
    timeToMinutes(shiftStartTime)
  if (diff <= 0) return { isLate: false, lateMinutes: 0 }
  return {
    isLate: diff > Math.max(0, toleranceMinutes),
    lateMinutes: diff,
  }
}
