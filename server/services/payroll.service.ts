import dayjs from 'dayjs'
import {
  ABSENCE_TYPES,
  isRemuneratedAbsence,
  type AbsenceType,
} from '~~/shared/absence'
import { Absence } from '~~/server/models/Absence'
import { Attendance } from '~~/server/models/Attendance'
import { Company } from '~~/server/models/Company'
import { Employee } from '~~/server/models/Employee'
import { LegalParams } from '~~/server/models/LegalParams'
import { Payroll } from '~~/server/models/Payroll'
import { PayrollConcept } from '~~/server/models/PayrollConcept'
import { Alert } from '~~/server/models/Alert'
import { getLoanDeductionForPeriod, recordLoanPayments } from '~~/server/services/loan.service'
import { publishAlert } from '~~/server/utils/alert-stream'
import { logAudit } from '~~/server/utils/audit'

/**
 * Tarifas ARL por clase de riesgo (Colombia).
 * Ahora son configurables por período en Parámetros legales
 * (`arlRates`); estos valores son solo el fallback por defecto.
 */
export const ARL_RATES: Record<number, number> = {
  1: 0.00522,
  2: 0.01044,
  3: 0.02436,
  4: 0.0435,
  5: 0.0696,
}

export const HEALTH_EMPLOYEE = 0.04
export const PENSION_EMPLOYEE = 0.04
export const HEALTH_EMPLOYER = 0.085
export const PENSION_EMPLOYER = 0.12
export const SENA_RATE = 0.02
export const ICBF_RATE = 0.03
export const COMPENSATION_FUND_RATE = 0.04
export const DEFAULT_BASE_HOURS_PER_MONTH = 240

const round2 = (value: number) => Math.round(value * 100) / 100

export interface IConceptValue {
  type: 'devengo' | 'deduccion'
  code: string
  name: string
  dianBlock: string
  value: number
  calculation: 'fijo' | 'porcentaje'
  baseValue: number
}

/**
 * Calcula el valor de los conceptos del catálogo sobre el salario base del
 * período. Fijo = valor por período; porcentaje = % del salario base.
 */
export const computeConceptValues = (
  concepts: Array<{
    type: string
    code: string
    name: string
    dianBlock: string
    calculation: string
    value: number
  }>,
  baseSalary: number,
): { items: IConceptValue[]; devengoTotal: number; deduccionTotal: number } => {
  let devengoTotal = 0
  let deduccionTotal = 0
  const items: IConceptValue[] = (concepts ?? []).map((concept) => {
    const amount =
      concept.calculation === 'porcentaje'
        ? round2((concept.value / 100) * baseSalary)
        : round2(concept.value)
    if (concept.type === 'devengo') devengoTotal += amount
    else deduccionTotal += amount
    return {
      type: concept.type as IConceptValue['type'],
      code: concept.code,
      name: concept.name,
      dianBlock: concept.dianBlock,
      value: amount,
      calculation: concept.calculation as IConceptValue['calculation'],
      baseValue: concept.value,
    }
  })
  return {
    items,
    devengoTotal: round2(devengoTotal),
    deduccionTotal: round2(deduccionTotal),
  }
}

/** Conceptos activos del catálogo de una empresa. */
const getActiveConcepts = (tenantId: string) =>
  PayrollConcept.find({ tenantId, active: true })
    .sort({ type: 1, sortOrder: 1 })
    .lean()

interface ILegalParamsInput {
  uvtValue?: number
  minimumWage?: number
  transportAllowance?: number
  withholdingRates?: Array<{ from: number; to: number; percentage: number }>
  healthPercentages?: { employee?: number; employer?: number }
  pensionPercentages?: { employee?: number; employer?: number }
  arlRates?: Record<string, number>
  parafiscales?: { sena?: number; icbf?: number; compensationFund?: number }
  incapacidadComunDailyPercent?: number
  employerPaidIncapacidadDays?: number
  baseHoursPerMonth?: number
}

/**
 * Devengados de un empleado en el período a partir de su asistencia.
 * - Salario base prorrateado por días con registro.
 * - Auxilio de transporte si el salario es menor a 2 SMMLV.
 * - Extras: 25% diurna, 75% nocturna; recargo nocturno 35% (ya calculado
 *   en asistencia como horas).
 */
export const calculateDevengados = async (
  employee: { _id: string; baseSalary?: number },
  periodStart: Date,
  periodEnd: Date,
  params: ILegalParamsInput,
  adjustments: { bonuses?: number; commissions?: number } = {},
) => {
  const summary = await Attendance.getRangeSummary(
    String(employee._id),
    periodStart,
    periodEnd,
  )
  // Ausencias aprobadas del período: los permisos remunerados cuentan como
  // días trabajados; las incapacidades agregan valor (empresa/EPS/ARL).
  const absences = await Absence.findApprovedByEmployeeAndRange(
    String(employee._id),
    periodStart,
    periodEnd,
  )
  let paidAbsenceDays = 0
  let absenceCompanyPaidValue = 0
  let absenceEpsValue = 0
  let absenceArlValue = 0
  let absenceCompanyPaidDays = 0
  let absenceEpsDays = 0
  let absenceArlDays = 0

  for (const absence of absences) {
    const type = absence.type as AbsenceType
    if (isRemuneratedAbsence(type)) {
      paidAbsenceDays += absence.days ?? 0
    } else if (type === ABSENCE_TYPES.INCAPACIDAD_COMUN) {
      absenceCompanyPaidValue += absence.companyPaidValue ?? 0
      absenceEpsValue += absence.epsValue ?? 0
      // Días que paga la empresa y días que asume la EPS en incapacidad común.
      const employerPaidDays = Math.min(
        absence.days ?? 0,
        params.employerPaidIncapacidadDays ?? 2,
      )
      absenceCompanyPaidDays += employerPaidDays
      absenceEpsDays += Math.max(0, (absence.days ?? 0) - employerPaidDays)
    } else if (type === ABSENCE_TYPES.INCAPACIDAD_LABORAL) {
      absenceArlValue += absence.arlValue ?? 0
      absenceArlDays += absence.days ?? 0
    }
  }

  const periodDays =
    Math.max(1, dayjs(periodEnd).diff(dayjs(periodStart), 'day') + 1)
  const daysWorked = Math.min(periodDays, summary.days + paidAbsenceDays)
  const factor = Math.min(1, daysWorked / periodDays)
  const fullBase = employee.baseSalary ?? 0
  const baseSalary = round2(fullBase * factor)

  const allowanceApplies =
    fullBase > 0 && fullBase < 2 * (params.minimumWage ?? 0)
  const transportAllowance = allowanceApplies
    ? round2((params.transportAllowance ?? 0) * factor)
    : 0

  const baseHours = params.baseHoursPerMonth || DEFAULT_BASE_HOURS_PER_MONTH
  const hourlyRate = fullBase / baseHours
  const overtimeDay = round2(summary.overtimeDayHours * hourlyRate * 1.25)
  const overtimeNight = round2(summary.overtimeNightHours * hourlyRate * 1.75)
  const nightSurcharge = round2(summary.nightSurcharge * hourlyRate)
  const bonuses = adjustments.bonuses ?? 0
  const commissions = adjustments.commissions ?? 0

  return {
    baseSalary,
    daysWorked,
    paidAbsenceDays,
    absenceCompanyPaidValue: round2(absenceCompanyPaidValue),
    absenceEpsValue: round2(absenceEpsValue),
    absenceArlValue: round2(absenceArlValue),
    absenceCompanyPaidDays,
    absenceEpsDays,
    absenceArlDays,
    transportAllowance,
    overtimeDay,
    overtimeNight,
    nightSurcharge,
    overtimeDayHours: summary.overtimeDayHours ?? 0,
    overtimeNightHours: summary.overtimeNightHours ?? 0,
    nightSurchargeHours: summary.nightSurcharge ?? 0,
    bonuses,
    commissions,
    total: round2(
      baseSalary +
        transportAllowance +
        overtimeDay +
        overtimeNight +
        nightSurcharge +
        absenceCompanyPaidValue +
        bonuses +
        commissions,
    ),
  }
}

/**
 * Deducciones del empleado: salud 4% y pensión 4% sobre el IBC
 * (base + auxilio, según el script; en Colombia el auxilio no cotiza —
 * ajustar aquí si se quiere el IBC solo sobre el salario), más retención
 * en la fuente por rangos de UVT.
 */
export const calculateDeducciones = (
  input: {
    baseSalary: number
    transportAllowance: number
    garnishments?: number
    loans?: number
  },
  params: ILegalParamsInput,
) => {
  const ibc = round2(input.baseSalary + input.transportAllowance)
  const employeeHealthRate =
    params.healthPercentages?.employee ?? HEALTH_EMPLOYEE
  const employeePensionRate =
    params.pensionPercentages?.employee ?? PENSION_EMPLOYEE
  const employeeHealth = round2(ibc * employeeHealthRate)
  const employeePension = round2(ibc * employeePensionRate)

  const uvt = params.uvtValue || 1
  const uvtIncome = input.baseSalary / uvt
  const bracket = (params.withholdingRates ?? []).find(
    (rate) => uvtIncome >= rate.from && uvtIncome <= rate.to,
  )
  const sourceRetention = bracket
    ? round2(Math.max(0, input.baseSalary - bracket.from * uvt) * (bracket.percentage / 100))
    : 0

  const garnishments = input.garnishments ?? 0
  const loans = input.loans ?? 0
  return {
    employeeHealth,
    employeePension,
    sourceRetention,
    garnishments,
    loans,
    total: round2(
      employeeHealth + employeePension + sourceRetention + garnishments + loans,
    ),
  }
}

/**
 * Seguridad social (cargas del empleador): salud 8.5%, pensión 12%,
 * ARL según clase de riesgo y parafiscales (SENA 2%, ICBF 3%, Caja 4%).
 * Nota: desde Ley 1607 los empleadores con >10 trabajadores están exentos
 * de SENA/ICBF; ajustar con un flag si aplica.
 */
export const calculateSeguridadSocial = (
  input: { baseSalary: number; transportAllowance: number },
  params: ILegalParamsInput,
  arlClass: number,
) => {
  const ibc = round2(input.baseSalary + input.transportAllowance)
  const employerHealthRate =
    params.healthPercentages?.employer ?? HEALTH_EMPLOYER
  const employerPensionRate =
    params.pensionPercentages?.employer ?? PENSION_EMPLOYER
  const arlRate = params.arlRates?.[String(arlClass)] ?? ARL_RATES[arlClass] ?? 0
  const senaRate = params.parafiscales?.sena ?? SENA_RATE
  const icbfRate = params.parafiscales?.icbf ?? ICBF_RATE
  const cajaRate = params.parafiscales?.compensationFund ?? COMPENSATION_FUND_RATE

  const employerHealth = round2(ibc * employerHealthRate)
  const employerPension = round2(ibc * employerPensionRate)
  const arl = round2(input.baseSalary * arlRate)
  const sena = round2(ibc * senaRate)
  const icbf = round2(ibc * icbfRate)
  const compensationFund = round2(ibc * cajaRate)

  return {
    employerHealth,
    employerPension,
    arl,
    sena,
    icbf,
    compensationFund,
    total: round2(
      employerHealth +
        employerPension +
        arl +
        sena +
        icbf +
        compensationFund,
    ),
  }
}

/** Valida que no exista otra nómina (no anulada) en el mismo período. */
export const validatePayrollPeriod = async (
  companyId: string,
  periodStart: Date,
  periodEnd: Date,
) => {
  const existing = await Payroll.findOne({
    tenantId: companyId,
    status: { $ne: 'cancelled' },
    periodStart: { $lte: periodEnd },
    periodEnd: { $gte: periodStart },
  })
  if (existing) {
    throw createError({
      statusCode: 409,
      message: 'Ya existe una nómina en ese período.',
    })
  }
}

/** Empleados activos de la empresa. */
export const getActiveEmployees = (companyId: string) =>
  Employee.find({ tenantId: companyId, active: true })

/** Obtiene los parámetros legales vigentes o lanza error. */
export const getCurrentLegalParams = async () => {
  const params = await LegalParams.getCurrent()
  if (!params) {
    throw createError({
      statusCode: 409,
      message: 'Configura primero los parámetros legales vigentes.',
    })
  }
  return params
}

/** Construye la entrada de un empleado dentro de la nómina. */
export const buildEmployeeEntry = async (
  employee: { _id: string; baseSalary?: number },
  periodStart: Date,
  periodEnd: Date,
  params: ILegalParamsInput,
  arlClass: number,
  adjustments: {
    bonuses?: number
    commissions?: number
    garnishments?: number
    loans?: number
  } = {},
  concepts: Array<{
    type: string
    code: string
    name: string
    dianBlock: string
    calculation: string
    value: number
  }> = [],
) => {
  const devengados = await calculateDevengados(
    employee,
    periodStart,
    periodEnd,
    params,
    adjustments,
  )
  // Descuento automático de préstamos activos del empleado en el período.
  const autoLoanDeduction = await getLoanDeductionForPeriod(
    String(employee._id),
    periodStart,
    periodEnd,
  )
  const manualLoans = adjustments.loans ?? 0
  const deducciones = calculateDeducciones(
    {
      baseSalary: devengados.baseSalary,
      transportAllowance: devengados.transportAllowance,
      garnishments: adjustments.garnishments,
      loans: round2(autoLoanDeduction + manualLoans),
    },
    params,
  )
  const seguridadSocial = calculateSeguridadSocial(
    {
      baseSalary: devengados.baseSalary,
      transportAllowance: devengados.transportAllowance,
    },
    params,
    arlClass,
  )
  const conceptSummary = computeConceptValues(concepts, devengados.baseSalary)
  devengados.total = round2(devengados.total + conceptSummary.devengoTotal)
  deducciones.total = round2(deducciones.total + conceptSummary.deduccionTotal)

  return {
    employee: employee._id,
    devengados,
    deducciones,
    seguridadSocial,
    conceptos: conceptSummary.items,
    totalToPay: Math.max(0, round2(devengados.total - deducciones.total)),
  }
}

/** Genera el resumen de la nómina (preparado para exportación PDF/Excel). */
export const generatePayrollReport = (payroll: {
  periodStart?: Date
  periodEnd?: Date
  status?: string
  employees?: unknown[]
  totalEarned?: number
  totalDeducted?: number
  totalSocialSecurity?: number
  totalToPay?: number
}) => ({
  period: {
    start: payroll.periodStart,
    end: payroll.periodEnd,
  },
  status: payroll.status,
  employees: payroll.employees?.length ?? 0,
  totalEarned: payroll.totalEarned,
  totalDeducted: payroll.totalDeducted,
  totalSocialSecurity: payroll.totalSocialSecurity,
  totalToPay: payroll.totalToPay,
})

/** Crea la nómina (borrador) liquidando a todos los empleados activos. */
export const createPayroll = async (
  data: { periodStart: Date; periodEnd: Date },
  createdBy?: string,
) => {
  const company = await Company.getConfig()
  if (!company) {
    throw createError({
      statusCode: 409,
      message: 'Configura primero los datos de la empresa.',
    })
  }
  if (data.periodEnd <= data.periodStart) {
    throw createError({
      statusCode: 400,
      message: 'El fin del período debe ser posterior al inicio.',
    })
  }
  await validatePayrollPeriod(String(company._id), data.periodStart, data.periodEnd)

  const params = await getCurrentLegalParams()
  const concepts = await getActiveConcepts(String(company._id))
  const employees = await getActiveEmployees(String(company._id))
  const entries = []

  for (const employee of employees) {
    entries.push(
      await buildEmployeeEntry(
        { _id: String(employee._id), baseSalary: employee.baseSalary },
        data.periodStart,
        data.periodEnd,
        params.toJSON(),
        employee.arlRiskClass,
        {},
        concepts,
      ),
    )
  }

  const payroll = await Payroll.create({
    tenantId: company._id,
    periodStart: data.periodStart,
    periodEnd: data.periodEnd,
    status: 'draft',
    employees: entries,
    createdBy,
  })

  // Alerta informativa cuando se crea un borrador (cola de aprobación).
  const draftAlert = await Alert.create({
    tenantId: company._id,
    module: 'payroll',
    type: 'info',
    alertKey: 'payroll_draft',
    targetRoles: ['admin', 'hr'],
    message: `Nómina en borrador creada: ${dayjs(data.periodStart).format('DD/MM/YYYY')} – ${dayjs(data.periodEnd).format('DD/MM/YYYY')}. Pendiente de aprobación.`,
  })
  publishAlert({
    _id: String(draftAlert._id),
    employee: '',
    module: 'payroll',
    type: 'info',
    alertKey: 'payroll_draft',
    targetRoles: ['admin', 'hr'],
    message: draftAlert.message,
    read: false,
    createdAt: new Date(),
  })

  await logAudit({
    module: 'payroll',
    action: 'create',
    entityId: String(payroll._id),
    userId: createdBy,
    description: `Nómina creada: ${dayjs(data.periodStart).format('DD/MM/YYYY')} – ${dayjs(data.periodEnd).format('DD/MM/YYYY')}`,
  })

  return payroll.toJSON()
}

/** Recalcula la nómina desde la asistencia (solo borrador). */
export const recalculatePayroll = async (id: string, userId?: string) => {
  const payroll = await Payroll.findById(id)
  if (!payroll) {
    throw createError({ statusCode: 404, message: 'Nómina no encontrada' })
  }
  if (payroll.status !== 'draft') {
    throw createError({
      statusCode: 400,
      message: 'Solo se puede recalcular una nómina en borrador.',
    })
  }

  const params = await getCurrentLegalParams()
  const concepts = await getActiveConcepts(String(payroll.tenantId))
  const entries = []
  for (const entry of payroll.employees ?? []) {
    const employee = await Employee.findById(entry.employee)
    if (!employee) continue
    entries.push(
      await buildEmployeeEntry(
        { _id: String(employee._id), baseSalary: employee.baseSalary },
        payroll.periodStart,
        payroll.periodEnd,
        params.toJSON(),
        employee.arlRiskClass,
        {},
        concepts,
      ),
    )
  }

  payroll.employees = entries
  await payroll.save()
  await logAudit({
    module: 'payroll',
    action: 'recalculate',
    entityId: id,
    userId,
    description: 'Nómina recalculada desde asistencia',
  })
  return payroll.toJSON()
}

/** Aprueba la nómina verificando que todos los empleados tengan asistencia. */
export const approvePayroll = async (id: string, userId?: string) => {
  const payroll = await Payroll.findById(id)
  if (!payroll) {
    throw createError({ statusCode: 404, message: 'Nómina no encontrada' })
  }
  if (payroll.status !== 'draft') {
    throw createError({
      statusCode: 400,
      message: 'Solo se puede aprobar una nómina en borrador.',
    })
  }

  const withoutAttendance = (payroll.employees ?? []).filter(
    (entry) =>
      (entry.devengados?.daysWorked ?? 0) === 0 &&
      (entry.devengados?.absenceCompanyPaidValue ?? 0) === 0,
  )
  if (withoutAttendance.length > 0) {
    throw createError({
      statusCode: 400,
      message: `${withoutAttendance.length} empleado(s) no tienen asistencia registrada en el período.`,
    })
  }

  payroll.status = 'approved'
  payroll.approvedBy = userId
  payroll.approvedAt = new Date()
  await payroll.save()

  // Registra los pagos de préstamos (historial y saldo) al aprobar la nómina.
  for (const entry of payroll.employees ?? []) {
    await recordLoanPayments(
      String(entry.employee),
      payroll.periodStart,
      payroll.periodEnd,
      userId,
    )
  }

  // Alerta informativa en tiempo real (SSE) cuando un borrador pasa a aprobado.
  const approvedAlert = await Alert.create({
    tenantId: payroll.tenantId,
    module: 'payroll',
    type: 'info',
    alertKey: 'payroll_approved',
    targetRoles: ['admin', 'hr', 'manager'],
    message: `Nómina aprobada: ${dayjs(payroll.periodStart).format('DD/MM/YYYY')} – ${dayjs(payroll.periodEnd).format('DD/MM/YYYY')} ($${Number(payroll.totalToPay ?? 0).toLocaleString('es-CO')})`,
  })
  publishAlert({
    _id: String(approvedAlert._id),
    employee: '',
    module: 'payroll',
    type: 'info',
    alertKey: 'payroll_approved',
    targetRoles: ['admin', 'hr', 'manager'],
    message: approvedAlert.message,
    read: false,
    createdAt: new Date(),
  })

  await logAudit({
    module: 'payroll',
    action: 'approve',
    entityId: id,
    userId,
    description: 'Nómina aprobada',
  })
  return payroll.toJSON()
}

/** Marca la nómina como pagada (solo aprobada). */
export const payPayroll = async (id: string, userId?: string) => {
  const payroll = await Payroll.findById(id)
  if (!payroll) {
    throw createError({ statusCode: 404, message: 'Nómina no encontrada' })
  }
  if (payroll.status !== 'approved') {
    throw createError({
      statusCode: 400,
      message: 'Solo se puede pagar una nómina aprobada.',
    })
  }
  payroll.status = 'paid'
  payroll.paidAt = new Date()
  await payroll.save()
  await logAudit({
    module: 'payroll',
    action: 'pay',
    entityId: id,
    userId,
    description: 'Nómina pagada',
  })
  return payroll.toJSON()
}

/** Anula la nómina (borrador o aprobada). */
export const cancelPayroll = async (id: string, userId?: string) => {
  const payroll = await Payroll.findById(id)
  if (!payroll) {
    throw createError({ statusCode: 404, message: 'Nómina no encontrada' })
  }
  if (!['draft', 'approved'].includes(payroll.status)) {
    throw createError({
      statusCode: 400,
      message: 'Solo se puede anular una nómina en borrador o aprobada.',
    })
  }
  payroll.status = 'cancelled'
  await payroll.save()
  await logAudit({
    module: 'payroll',
    action: 'cancel',
    entityId: id,
    userId,
    description: 'Nómina anulada',
  })
  return payroll.toJSON()
}

/**
 * Actualiza una nómina en borrador: observaciones y ajustes manuales
 * (bonificaciones, comisiones, embargos, préstamos) por empleado.
 */
export const updatePayroll = async (
  id: string,
  data: {
    observations?: string
    employees?: Array<{
      employeeId: string
      bonuses?: number
      commissions?: number
      garnishments?: number
      loans?: number
    }>
  },
  userId?: string,
) => {
  const payroll = await Payroll.findById(id)
  if (!payroll) {
    throw createError({ statusCode: 404, message: 'Nómina no encontrada' })
  }
  if (payroll.status !== 'draft') {
    throw createError({
      statusCode: 400,
      message: 'Solo se puede editar una nómina en borrador.',
    })
  }

  if (data.observations !== undefined) {
    payroll.employees = (payroll.employees ?? []).map((entry) => ({
      ...entry,
      observations: data.observations,
    }))
  }

  const params = await getCurrentLegalParams()
  const concepts = await getActiveConcepts(String(payroll.tenantId))
  for (const adjustment of data.employees ?? []) {
    const entry = (payroll.employees ?? []).find(
      (item) => String(item.employee) === adjustment.employeeId,
    )
    if (!entry) continue

    const employee = await Employee.findById(adjustment.employeeId)
    const rebuilt = await buildEmployeeEntry(
      { _id: adjustment.employeeId, baseSalary: employee?.baseSalary },
      payroll.periodStart,
      payroll.periodEnd,
      params.toJSON(),
      employee?.arlRiskClass ?? 1,
      {
        bonuses: adjustment.bonuses,
        commissions: adjustment.commissions,
        garnishments: adjustment.garnishments,
        loans: adjustment.loans,
      },
      concepts,
    )
    const index = payroll.employees.findIndex(
      (item) => String(item.employee) === adjustment.employeeId,
    )
    if (index >= 0) payroll.employees[index] = rebuilt as never
  }

  await payroll.save()
  await logAudit({
    module: 'payroll',
    action: 'update',
    entityId: id,
    userId,
    description: 'Nómina actualizada (ajustes manuales)',
  })
  return payroll.toJSON()
}
