import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import mongoose from 'mongoose'
import { Absence, type IAbsence } from '~~/server/models/Absence'
import { Attendance } from '~~/server/models/Attendance'
import { Company } from '~~/server/models/Company'
import { Employee } from '~~/server/models/Employee'
import { Alert } from '~~/server/models/Alert'
import { publishAlert } from '~~/server/utils/alert-stream'
import {
  ABSENCE_STATUS,
  ABSENCE_TYPES,
  DEFAULT_EMPLOYER_PAID_INCAPACIDAD_DAYS,
  DEFAULT_MAX_DAYS_PER_YEAR,
  INCAPACIDAD_COMUN_DAILY_PERCENT,
  getRestDaySurchargeRate,
  isIncapacidad,
  isRemuneratedAbsence,
  type AbsenceType,
} from '~~/shared/absence'
import type { UserRole } from '~~/shared/auth'

dayjs.extend(utc)

/** Crea y publica una alerta de ausencias (SSE en vivo). */
const createAbsenceAlert = async (absence: {
  tenantId: string | mongoose.Types.ObjectId
  employee?: unknown
  type: string
  message: string
  alertType?: 'info' | 'warning'
  alertKey: string
  targetRoles: UserRole[]
}) => {
  const alert = await Alert.create({
    tenantId: absence.tenantId as never,
    employee: (absence.employee ?? null) as never,
    module: 'absence',
    type: absence.alertType ?? 'info',
    message: absence.message,
    alertKey: absence.alertKey,
    targetRoles: absence.targetRoles,
  })
  publishAlert({
    _id: String(alert._id),
    employee: String(absence.employee ?? ''),
    module: 'absence',
    type: absence.alertType ?? 'info',
    message: absence.message,
    alertKey: absence.alertKey,
    targetRoles: absence.targetRoles,
    read: false,
    createdAt: new Date(),
  })
  return alert
}

/** Etiqueta legible del tipo de ausencia. */
const absenceTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    Permiso_Medico: 'permiso médico',
    Permiso_Escolar: 'obligación escolar',
    Permiso_Legal: 'citación legal',
    Permiso_Bicicleta: 'día de la bicicleta',
    Calamidad_Domestica: 'calamidad doméstica',
    Luto: 'luto',
    Matrimonio: 'matrimonio',
    Incapacidad_Comun: 'incapacidad común',
    Incapacidad_Laboral: 'incapacidad laboral',
    Vacaciones: 'vacaciones',
    Sin_Remunerar: 'permiso sin remunerar',
    Descanso_Compensatorio: 'descanso compensatorio',
  }
  return labels[type] ?? type
}

const round2 = (value: number) => Math.round(value * 100) / 100

/** Forma de las políticas de ausencias (tipado explícito para el schema). */
interface IAbsencePolicies {
  maxDaysPerYear?: Map<string, number>
  employerPaidIncapacidadDays?: number
  restDaySurchargeOverride?: number | null
  requireSupportDocument?: boolean
}

/** Salario diario (base / 30, mes comercial colombiano). */
export const getDailySalary = (baseSalary: number) => round2(baseSalary / 30)

/**
 * Calcula los días hábiles entre dos fechas (inclusive).
 * La semana laboral colombiana es lunes a sábado; `dayOff` es el día de
 * descanso semanal (0=domingo … 6=sábado). No descuenta festivos
 * (se puede ampliar cuando exista un calendario de festivos).
 */
export const calculateBusinessDays = (
  start: Date | string,
  end: Date | string,
  dayOff = 0,
): number => {
  const from = dayjs(start).startOf('day')
  const to = dayjs(end).startOf('day')
  if (!from.isValid() || !to.isValid() || to.isBefore(from)) return 0

  let days = 0
  let cursor = from
  while (!cursor.isAfter(to)) {
    if (cursor.day() !== dayOff) days += 1
    cursor = cursor.add(1, 'day')
  }
  return days
}

/**
 * Días efectivos de una ausencia según su tipo:
 * - Permisos (calendario laboral): días hábiles según el descanso del empleado.
 * - Incapacidades y vacaciones: días de calendario.
 */
export const getAbsenceDays = (
  type: AbsenceType,
  start: Date | string,
  end: Date | string,
  dayOff = 0,
): number => {
  if (
    type === ABSENCE_TYPES.INCAPACIDAD_COMUN ||
    type === ABSENCE_TYPES.INCAPACIDAD_LABORAL ||
    type === ABSENCE_TYPES.VACACIONES ||
    type === ABSENCE_TYPES.DESCANSO_COMPENSATORIO ||
    type === ABSENCE_TYPES.SIN_REMUNERAR
  ) {
    return Math.max(0, dayjs(end).diff(dayjs(start), 'day') + 1)
  }
  return calculateBusinessDays(start, end, dayOff)
}

/**
 * Incapacidad común (Ley 100/93): el empleador paga los primeros `employerDays`
 * (por defecto 2) al 66.67% del salario diario; del día `employerDays + 1` al
 * día 90 los cubre la EPS con la misma base (sin tope de 25 SMMLV en este
 * cálculo; el tope se puede añadir desde los parámetros legales).
 */
export const calculateIncapacidadComun = (
  salarioBase: number,
  dias: number,
  employerDays = DEFAULT_EMPLOYER_PAID_INCAPACIDAD_DAYS,
) => {
  const daily = getDailySalary(salarioBase)
  const employerPaid = Math.min(employerDays, dias)
  const epsPaid = Math.max(0, dias - employerDays)
  return {
    totalDays: dias,
    employerPaidDays: employerPaid,
    epsPaidDays: epsPaid,
    employerValue: round2(employerPaid * daily * INCAPACIDAD_COMUN_DAILY_PERCENT),
    epsValue: round2(epsPaid * daily * INCAPACIDAD_COMUN_DAILY_PERCENT),
    totalValue: round2(dias * daily * INCAPACIDAD_COMUN_DAILY_PERCENT),
  }
}

/**
 * Incapacidad laboral: el 100% del salario está a cargo de la ARL desde el
 * primer día (Decreto 1295/94).
 */
export const calculateIncapacidadLaboral = (salarioBase: number, dias: number) => {
  const daily = getDailySalary(salarioBase)
  return {
    totalDays: dias,
    employerPaidDays: 0,
    arlPaidDays: dias,
    arlValue: round2(dias * daily),
    totalValue: round2(dias * daily),
  }
}

/**
 * Recargo por trabajar el día de descanso semanal (Ley 2101/2021):
 * 80% hasta jun/2026, 90% hasta jun/2027 y 100% desde jul/2027.
 * `overrideRate` permite que la empresa fije otro porcentaje.
 */
export const calculateDescansoRecargo = (
  fecha: Date | string,
  salarioBase: number,
  overrideRate?: number | null,
) => {
  const rate = overrideRate ?? getRestDaySurchargeRate(fecha)
  const daily = getDailySalary(salarioBase)
  return {
    rate,
    dailySalary: daily,
    surchargeValue: round2(daily * rate),
  }
}

/**
 * Determina si el empleado tiene descanso(s) compensatorio(s) pendientes por
 * trabajar domingos/festivos en el mes.
 *
 * Regla (Ley 2101/2021, Código Sustantivo del Trabajo):
 * - Hasta 2 domingos/festivos trabajados en un mes → compensatorio opcional
 *   (el empleador puede pagar recargo o dar el descanso).
 * - A partir del tercero → compensatorio obligatorio la semana siguiente.
 *
 * Implementación simplificada: cuenta los domingos trabajados (no considera
 * festivos hasta tener un calendario de festivos).
 */
export const shouldGiveCompensatoryRest = async (
  empleadoId: string,
  mes: number,
  anio: number,
) => {
  const employee = await Employee.findById(empleadoId).select(
    'diaDescanso baseSalary assignedShift',
  )
  if (!employee) {
    throw createError({ statusCode: 404, message: 'Empleado no encontrado' })
  }

  const dayOff = employee.diaDescanso ?? 0
  const start = dayjs(new Date(Date.UTC(anio, mes - 1, 1)))
  const end = dayjs(new Date(Date.UTC(anio, mes, 0)))

  const records = await Attendance.find({
    employee: empleadoId,
    date: {
      $gte: start.startOf('day').toDate(),
      $lte: end.endOf('day').toDate(),
    },
  }).lean()

  const restDaysWorked = records.filter((record) => {
    const recordDate = dayjs.utc(record.date)
    return (
      recordDate.format('YYYY-MM') === start.utc().format('YYYY-MM') &&
      recordDate.day() === dayOff
    )
  })
  const count = restDaysWorked.length
  const mandatory = count >= 3

  return {
    employee: empleadoId,
    month: mes,
    year: anio,
    restDaysWorked: count,
    threshold: 3,
    mandatory,
    optional: count > 0 && count < 3,
    /** Descanso compensatorio sugerido: la semana siguiente a la última fecha. */
    suggestedRestDate:
      count > 0
        ? dayjs
            .utc(restDaysWorked[restDaysWorked.length - 1].date)
            .add(7, 'day')
            .format('YYYY-MM-DD')
        : null,
  }
}

/**
 * Verifica si un tipo de permiso es remunerado y cuánto afecta la nómina.
 * `usedDays` permite evaluar el saldo disponible del año contra la política.
 */
export const calculatePermisoRemunerado = (
  tipo: AbsenceType,
  dias: number,
  usedDays = 0,
  maxDaysPerYear?: number,
) => {
  const remunerado = isRemuneratedAbsence(tipo)
  const max = maxDaysPerYear ?? DEFAULT_MAX_DAYS_PER_YEAR[tipo] ?? 30
  const saldo = Math.max(0, max - usedDays)
  return {
    type: tipo,
    remunerado,
    dias,
    maxDaysPerYear: max,
    usedDays,
    remainingDays: saldo,
    exceedsPolicy: dias > saldo,
    /** Días que se descuentan del salario base (0 si es remunerado). */
    unpaidDays: remunerado ? 0 : dias,
    /** Días que cuentan como trabajados para devengados y prestaciones. */
    countedDays: remunerado ? dias : 0,
  }
}

/**
 * Calcula los valores monetarios de una ausencia según su tipo.
 * - Permisos remunerados: se cuentan como días trabajados (sin valor extra).
 * - Incapacidad común: empresa paga días 1-2; EPS el resto.
 * - Incapacidad laboral: ARL 100%.
 * - Descanso compensatorio: recargo por el día de descanso trabajado.
 */
export const calculateAbsenceValues = (
  type: AbsenceType,
  salarioBase: number,
  dias: number,
  options: {
    employerPaidIncapacidadDays?: number
    restDaySurchargeOverride?: number | null
    restDayWorkedDate?: Date | string | null
  } = {},
) => {
  if (type === ABSENCE_TYPES.INCAPACIDAD_COMUN) {
    const { employerValue, epsValue, employerPaidDays } = calculateIncapacidadComun(
      salarioBase,
      dias,
      options.employerPaidIncapacidadDays,
    )
    return {
      paidByCompanyDays: employerPaidDays,
      companyPaidValue: employerValue,
      epsValue,
      arlValue: 0,
    }
  }

  if (type === ABSENCE_TYPES.INCAPACIDAD_LABORAL) {
    const { arlValue, arlPaidDays } = calculateIncapacidadLaboral(salarioBase, dias)
    return {
      paidByCompanyDays: 0,
      companyPaidValue: 0,
      epsValue: 0,
      arlValue,
      arlPaidDays,
    }
  }

  if (type === ABSENCE_TYPES.DESCANSO_COMPENSATORIO && options.restDayWorkedDate) {
    const { surchargeValue } = calculateDescansoRecargo(
      options.restDayWorkedDate,
      salarioBase,
      options.restDaySurchargeOverride,
    )
    return {
      paidByCompanyDays: 0,
      companyPaidValue: surchargeValue,
      epsValue: 0,
      arlValue: 0,
      surchargePaid: true,
    }
  }

  return {
    paidByCompanyDays: 0,
    companyPaidValue: 0,
    epsValue: 0,
    arlValue: 0,
  }
}

/**
 * Valida que la ausencia no supere la política anual de la empresa para el
 * tipo (días máximos por año). No bloquea incapacidades (tienen su propia
 * cobertura EPS/ARL) ni descansos compensatorios.
 */
export const validateAnnualPolicy = async (
  employeeId: string,
  type: AbsenceType,
  days: number,
  year: number,
  excludeId?: string,
) => {
  if (isIncapacidad(type) || type === ABSENCE_TYPES.DESCANSO_COMPENSATORIO) {
    return { allowed: true, remainingDays: Infinity, message: '' }
  }

  const company = await Company.getConfig()
  const policy = (company?.absencePolicies ?? {}) as IAbsencePolicies
  const configuredMax = policy.maxDaysPerYear?.get?.(type) as number | undefined
  const maxDays = configuredMax ?? DEFAULT_MAX_DAYS_PER_YEAR[type] ?? 30

  const start = dayjs(new Date(Date.UTC(year, 0, 1)))
  const end = dayjs(new Date(Date.UTC(year, 11, 31)))
  const used = await Absence.countDocuments({
    employee: employeeId,
    type,
    status: { $ne: ABSENCE_STATUS.REJECTED },
    startDate: { $lte: end.toDate() },
    endDate: { $gte: start.toDate() },
    _id: { $ne: excludeId },
  })
  const remainingDays = Math.max(0, maxDays - used)

  return {
    allowed: days <= remainingDays,
    remainingDays,
    maxDays,
    usedDays: used,
    message:
      days > remainingDays
        ? `El tipo ${type} supera la política anual: máximo ${maxDays} días y quedan ${remainingDays}.`
        : '',
  }
}

/**
 * Crea una ausencia y calcula automáticamente:
 * - días efectivos (hábiles o calendario),
 * - valores de incapacidad (empresa/EPS/ARL),
 * - recargo y compensatorio para descansos,
 * - política anual por tipo de permiso.
 */
export const createAbsence = async (
  data: {
    employeeId: string
    type: AbsenceType
    startDate: Date
    endDate: Date
    scheduledRestDate?: Date | null
    supportDocument?: string
    observations?: string
    status?: IAbsence['status']
  },
  userId?: string,
) => {
  const employee = await Employee.findById(data.employeeId)
  if (!employee) {
    throw createError({ statusCode: 404, message: 'Empleado no encontrado' })
  }
  if (dayjs(data.endDate).isBefore(dayjs(data.startDate), 'day')) {
    throw createError({
      statusCode: 400,
      message: 'La fecha final debe ser posterior o igual a la inicial.',
    })
  }

  const days = getAbsenceDays(
    data.type,
    data.startDate,
    data.endDate,
    employee.diaDescanso ?? 0,
  )
  if (days <= 0) {
    throw createError({ statusCode: 400, message: 'La ausencia no tiene días efectivos.' })
  }

  const company = await Company.getConfig()
  const policy = (company?.absencePolicies ?? {}) as IAbsencePolicies

  const policyCheck = await validateAnnualPolicy(
    String(employee._id),
    data.type,
    days,
    dayjs(data.startDate).year(),
  )
  if (!policyCheck.allowed) {
    throw createError({ statusCode: 409, message: policyCheck.message })
  }

  const values = calculateAbsenceValues(
    data.type,
    employee.baseSalary,
    days,
    {
      employerPaidIncapacidadDays:
        policy.employerPaidIncapacidadDays ??
        DEFAULT_EMPLOYER_PAID_INCAPACIDAD_DAYS,
      restDaySurchargeOverride: policy.restDaySurchargeOverride ?? null,
      restDayWorkedDate:
        data.type === ABSENCE_TYPES.DESCANSO_COMPENSATORIO
          ? data.scheduledRestDate ?? data.startDate
          : null,
    },
  )

  const absence = await Absence.create({
    tenantId: employee.tenantId,
    employee: employee._id,
    type: data.type,
    startDate: data.startDate,
    endDate: data.endDate,
    days,
    scheduledRestDate: data.scheduledRestDate ?? null,
    surchargePaid: values.surchargePaid ?? false,
    paidByCompanyDays: values.paidByCompanyDays ?? 0,
    companyPaidValue: values.companyPaidValue ?? 0,
    epsValue: values.epsValue ?? 0,
    arlValue: values.arlValue ?? 0,
    supportDocument: data.supportDocument,
    observations: data.observations,
    status: data.status ?? ABSENCE_STATUS.PENDING,
    createdBy: userId as never,
  })

  if (absence.status === ABSENCE_STATUS.PENDING) {
    await createAbsenceAlert({
      tenantId: absence.tenantId,
      employee: absence.employee,
      type: absence.type as string,
      alertType: 'warning',
      alertKey: 'absence_pending',
      targetRoles: ['admin', 'hr', 'manager'],
      message: `${employee.firstName} ${employee.lastName} solicitó ${absenceTypeLabel(absence.type as string)} (${absence.days} día(s)) y está pendiente de aprobación.`,
    })
  }

  return absence.toJSON()
}

/**
 * Aprueba una ausencia (vuelve a validar la política anual al aprobar,
 * porque RRHH puede registrar antes y aprobar después).
 */
export const approveAbsence = async (id: string, userId?: string) => {
  const absence = await Absence.findById(id)
  if (!absence) {
    throw createError({ statusCode: 404, message: 'Ausencia no encontrada' })
  }
  if (absence.status === ABSENCE_STATUS.APPROVED) {
    throw createError({ statusCode: 400, message: 'La ausencia ya está aprobada.' })
  }

  const policyCheck = await validateAnnualPolicy(
    String(absence.employee),
    absence.type as AbsenceType,
    absence.days,
    dayjs(absence.startDate).year(),
    id,
  )
  if (!policyCheck.allowed) {
    throw createError({ statusCode: 409, message: policyCheck.message })
  }

  absence.status = ABSENCE_STATUS.APPROVED
  absence.approvedBy = userId as never
  absence.approvedAt = new Date()
  await absence.save()

  const employee = await Employee.findById(absence.employee).select('firstName lastName')
  await createAbsenceAlert({
    tenantId: absence.tenantId,
    employee: absence.employee,
    type: absence.type as string,
    alertKey: 'absence_approved',
    targetRoles: ['admin', 'hr', 'manager'],
    message: `Ausencia aprobada: ${employee?.firstName ?? ''} ${employee?.lastName ?? ''} · ${absenceTypeLabel(absence.type as string)} (${absence.days} día(s)).`,
  })

  return absence.toJSON()
}

/** Rechaza una ausencia con motivo. */
export const rejectAbsence = async (
  id: string,
  reason: string,
  userId?: string,
) => {
  const absence = await Absence.findById(id)
  if (!absence) {
    throw createError({ statusCode: 404, message: 'Ausencia no encontrada' })
  }
  absence.status = ABSENCE_STATUS.REJECTED
  absence.rejectionReason = reason
  absence.approvedBy = userId as never
  absence.approvedAt = new Date()
  await absence.save()

  const employee = await Employee.findById(absence.employee).select('firstName lastName')
  await createAbsenceAlert({
    tenantId: absence.tenantId,
    employee: absence.employee,
    type: absence.type as string,
    alertType: 'warning',
    alertKey: 'absence_rejected',
    targetRoles: ['admin', 'hr', 'manager'],
    message: `Ausencia rechazada: ${employee?.firstName ?? ''} ${employee?.lastName ?? ''} · ${absenceTypeLabel(absence.type as string)}. Motivo: ${reason}`,
  })

  return absence.toJSON()
}

/** Ausencias aprobadas de un empleado que intersectan el período. */
export const getApprovedAbsencesForPeriod = (
  employeeId: string,
  periodStart: Date,
  periodEnd: Date,
) =>
  Absence.findApprovedByEmployeeAndRange(employeeId, periodStart, periodEnd)

/** Días remunerados de ausencia dentro del período (para nómina). */
export const getPaidAbsenceDaysForPeriod = async (
  employeeId: string,
  periodStart: Date,
  periodEnd: Date,
  _dayOff = 0,
) => {
  const absences = await getApprovedAbsencesForPeriod(employeeId, periodStart, periodEnd)
  let paidDays = 0
  let unpaidDays = 0
  let companyPaidValue = 0
  let epsValue = 0
  let arlValue = 0

  for (const absence of absences) {
    const a = absence as IAbsence & {
      type: AbsenceType
      days: number
      companyPaidValue?: number
      epsValue?: number
      arlValue?: number
    }
    const type = a.type
    if (isRemuneratedAbsence(type)) {
      paidDays += a.days ?? 0
    } else if (
      type === ABSENCE_TYPES.INCAPACIDAD_COMUN ||
      type === ABSENCE_TYPES.INCAPACIDAD_LABORAL
    ) {
      // Las incapacidades no restan días: el empleador/EPS/ARL paga el valor.
      companyPaidValue += a.companyPaidValue ?? 0
      epsValue += a.epsValue ?? 0
      arlValue += a.arlValue ?? 0
    } else {
      unpaidDays += a.days ?? 0
    }
  }

  return { paidDays, unpaidDays, companyPaidValue, epsValue, arlValue }
}

/** Verifica si un empleado tiene ausencia aprobada en una fecha concreta. */
export const hasAbsenceOnDate = async (employeeId: string, date: Date) => {
  const start = dayjs(date).startOf('day').toDate()
  const end = dayjs(date).endOf('day').toDate()
  const absence = await Absence.findOne({
    employee: employeeId,
    status: ABSENCE_STATUS.APPROVED,
    startDate: { $lte: end },
    endDate: { $gte: start },
  }).lean()
  return !!absence
}
