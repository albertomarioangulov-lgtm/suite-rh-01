#!/usr/bin/env node
/**
 * Seed de demostración: 4 meses completos de HRMS.
 *
 * Genera (idempotente):
 * - Usuarios demo (rol employee, contraseña "Demo123!") + fichas de empleado.
 * - Turnos: diurno ("Turno 1") y tarde.
 * - Asistencias aprobadas de lunes a viernes en los 4 meses, con perfiles
 *   variados: jornada estándar, horas extras, recargo nocturno y ausencias.
 * - Ausencias aprobadas de varios tipos (permiso médico, citación legal,
 *   calamidad, luto, incapacidad común, vacaciones, día de bicicleta,
 *   permiso sin remunerar).
 * - Nóminas: los 3 primeros meses APROBADAS y el último (mes actual) en
 *   BORRADOR, con devengados/deducciones/seguridad social calculados igual
 *   que el servicio de producción.
 *
 * Uso:
 *   node scripts/seed-demo-payroll-month.mjs
 *   DEMO_MONTH=7 DEMO_YEAR=2026 node scripts/seed-demo-payroll-month.mjs
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import {
  splitDayNightHours,
  splitOvertimeFromEnd,
} from '../shared/utils/datetime-helpers.ts'
import {
  ABSENCE_TYPES,
  DEFAULT_EMPLOYER_PAID_INCAPACIDAD_DAYS,
  INCAPACIDAD_COMUN_DAILY_PERCENT,
  REMUNERATED_ABSENCE_TYPES,
} from '../shared/absence.ts'
import { ROLES } from '../shared/auth.ts'

const NIGHT_START = '19:00'
const NIGHT_END = '06:00'
const REGULAR_DAILY_HOURS = 8
const NIGHT_SURCHARGE_RATE = 0.35

const round2 = (value) => Math.round(value * 100) / 100
const pad = (value) => String(value).padStart(2, '0')

// Ventana demo: 4 meses terminando en el mes actual (por defecto).
const today = new Date()
const DEMO_YEAR = Number(process.env.DEMO_YEAR) || today.getFullYear()
const DEMO_MONTH = Number(process.env.DEMO_MONTH) || today.getMonth() + 1
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo123!'
const MONTH_COUNT = 4

const uri = `${process.env.MONGODB_URI}/${process.env.MONGODB_NAME || 'nomina_app'}?retryWrites=true&w=majority`
await mongoose.connect(uri)
const db = mongoose.connection.db

const companies = db.collection('companies')
const users = db.collection('users')
const employees = db.collection('employees')
const shifts = db.collection('shifts')
const attendances = db.collection('attendances')
const absences = db.collection('absences')
const payrolls = db.collection('payrolls')

const company = await companies.findOne({ active: true })
if (!company) {
  console.error('No hay empresa activa. Configura primero la empresa.')
  await mongoose.disconnect()
  process.exit(1)
}

const legal = await db.collection('legalparams').findOne({ active: true })
if (!legal) {
  console.error(
    'No hay parámetros legales vigentes. Ejecuta primero: node scripts/seed-legal-params-2026.mjs',
  )
  await mongoose.disconnect()
  process.exit(1)
}

const admin = await users.findOne({ role: ROLES.ADMIN, active: true })
const now = new Date()

// Fechas de los 4 meses (más antiguo → más reciente; el último va en borrador).
const months = []
for (let offset = MONTH_COUNT - 1; offset >= 0; offset -= 1) {
  const base = new Date(DEMO_YEAR, DEMO_MONTH - 1 - offset, 1)
  const year = base.getFullYear()
  const month = base.getMonth() + 1
  const daysInMonth = new Date(year, month, 0).getDate()
  months.push({
    offset,
    year,
    month,
    label: `${year}-${pad(month)}`,
    // Fechas date-only almacenadas a mediodía UTC (igual que la app) para
    // que el período se muestre 01/MM – último/MM sin desfase de zona horaria.
    start: new Date(`${year}-${pad(month)}-01T12:00:00.000Z`),
    end: new Date(`${year}-${pad(month)}-${pad(daysInMonth)}T12:00:00.000Z`),
    status: offset === 0 ? 'draft' : 'approved',
  })
}

console.log(
  `Ventana demo: ${months[3].label} (borrador) + ${months[0].label} – ${months[2].label} (aprobadas)`,
)

// ------------------------------------------------------------- perfiles
const DAY = 'day'
const AFTERNOON = 'afternoon'

/**
 * Perfil de cada empleado demo.
 * `absences` define las ausencias aprobadas: [mesOffset, tipo, inicio(día), fin(día)].
 * `overtimeWeekdays` marca los días de la semana con hora extra (0=domingo…6=sábado).
 */
const profiles = [
  {
    document: '1000000001',
    firstName: 'Ana',
    lastName: 'Martínez',
    email: 'demo.ana@nomina.test',
    baseSalary: 3200000,
    position: 'Contadora',
    contractType: 'indefinite',
    shiftType: DAY,
    arlRiskClass: 1,
    overtimeWeekdays: [],
    absences: [],
  },
  {
    document: '1000000002',
    firstName: 'Carlos',
    lastName: 'Gómez',
    email: 'demo.carlos@nomina.test',
    baseSalary: 1750905,
    position: 'Auxiliar administrativo',
    contractType: 'indefinite',
    shiftType: DAY,
    arlRiskClass: 1,
    overtimeWeekdays: [],
    absences: [
      [3, ABSENCE_TYPES.PERMISO_MEDICO, 8, 8],
      [2, ABSENCE_TYPES.PERMISO_LEGAL, 20, 20],
      [1, ABSENCE_TYPES.CALAMIDAD_DOMESTICA, 10, 11],
      [0, ABSENCE_TYPES.LUTO, 6, 6],
    ],
  },
  {
    document: '1000000003',
    firstName: 'Luis',
    lastName: 'Pérez',
    email: 'demo.luis@nomina.test',
    baseSalary: 1850000,
    position: 'Operario de producción',
    contractType: 'fixed',
    shiftType: AFTERNOON,
    arlRiskClass: 2,
    overtimeWeekdays: [],
    absences: [[1, ABSENCE_TYPES.INCAPACIDAD_COMUN, 15, 19]],
  },
  {
    document: '1000000004',
    firstName: 'María',
    lastName: 'Rodríguez',
    email: 'demo.maria@nomina.test',
    baseSalary: 1750905,
    position: 'Auxiliar de bodega',
    contractType: 'fixed',
    shiftType: AFTERNOON,
    arlRiskClass: 2,
    overtimeWeekdays: [1, 3],
    absences: [[1, ABSENCE_TYPES.VACACIONES, 22, 24]],
  },
  {
    document: '1000000005',
    firstName: 'Jorge',
    lastName: 'Sánchez',
    email: 'demo.jorge@nomina.test',
    baseSalary: 2800000,
    position: 'Supervisor de planta',
    contractType: 'indefinite',
    shiftType: DAY,
    arlRiskClass: 1,
    overtimeWeekdays: [1, 3, 5],
    absences: [
      [2, ABSENCE_TYPES.PERMISO_BICICLETA, 3, 3],
      [0, ABSENCE_TYPES.SIN_REMUNERAR, 13, 14],
    ],
  },
  // Bajas demo para el KPI de rotación (contrato vencido / retiro voluntario).
  {
    document: '1000000101',
    firstName: 'Paola',
    lastName: 'Rincón',
    email: 'demo.paola@nomina.test',
    baseSalary: 1750905,
    position: 'Auxiliar de cartera',
    contractType: 'fixed',
    shiftType: DAY,
    arlRiskClass: 1,
    overtimeWeekdays: [],
    absences: [],
    terminated: true,
    terminationDate: '2026-05-31',
    terminationReason: 'contrato_vencido',
  },
  {
    document: '1000000102',
    firstName: 'Ricardo',
    lastName: 'Mora',
    email: 'demo.ricardo@nomina.test',
    baseSalary: 2200000,
    position: 'Analista de compras',
    contractType: 'indefinite',
    shiftType: DAY,
    arlRiskClass: 1,
    overtimeWeekdays: [],
    absences: [],
    terminated: true,
    terminationDate: '2026-06-15',
    terminationReason: 'retiro_voluntario',
  },
]

// ---------------------------------------------------------------- turnos
const dayShift = await shifts.findOne({ tenantId: company._id, name: 'Turno 1' })
const dayShiftId =
  dayShift?._id ??
  (
    await shifts.insertOne({
      tenantId: company._id,
      name: 'Turno 1',
      type: 'fixed',
      days: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
        dayOfWeek,
        ranges: [
          { startTime: '08:00', endTime: '12:00' },
          { startTime: '13:00', endTime: '17:00' },
        ],
        workHours: 8,
        active: true,
      })),
      description: 'Jornada diurna estándar (lunes a viernes)',
      color: '#1867C0',
      active: true,
      createdBy: admin?._id ?? null,
      createdAt: now,
      updatedAt: now,
    })
  ).insertedId

let afternoonShift = await shifts.findOne({
  tenantId: company._id,
  name: 'Turno tarde',
})
if (!afternoonShift) {
  const result = await shifts.insertOne({
    tenantId: company._id,
    name: 'Turno tarde',
    type: 'fixed',
    days: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      dayOfWeek,
      ranges: [
        { startTime: '13:00', endTime: '17:00' },
        { startTime: '18:00', endTime: '22:00' },
      ],
      workHours: 8,
      active: true,
    })),
    description: 'Jornada de tarde con recargo nocturno (lunes a viernes)',
    color: '#00796B',
    active: true,
    createdBy: admin?._id ?? null,
    createdAt: now,
    updatedAt: now,
  })
  afternoonShift = { _id: result.insertedId }
}
const afternoonShiftId = afternoonShift._id

// ----------------------------------------------------- empleados + usuarios
const demoEmployeeIds = []
const demoEmployees = []
let createdEmployees = 0
let updatedEmployees = 0

const upsertEmployee = async (profile) => {
  let user = await users.findOne({ email: profile.email })
  if (!user) {
    const password = await bcrypt.hash(DEMO_PASSWORD, 10)
    const result = await users.insertOne({
      email: profile.email,
      password,
      name: `${profile.firstName} ${profile.lastName}`,
      role: ROLES.EMPLOYEE,
      active: true,
      emailStatus: 'none',
      createdAt: now,
      updatedAt: now,
    })
    user = { _id: result.insertedId }
    console.log(`  usuario creado: ${profile.email}`)
  }

  const shiftId = profile.shiftType === AFTERNOON ? afternoonShiftId : dayShiftId
  const existing = await employees.findOne({
    tenantId: company._id,
    document: profile.document,
  })
  const data = {
    tenantId: company._id,
    user: user._id,
    document: profile.document,
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    hireDate: new Date(`${months[3].year}-01-05T12:00:00.000Z`),
    contractType: profile.contractType,
    baseSalary: profile.baseSalary,
    arlRiskClass: profile.arlRiskClass,
    position: profile.position,
    assignedShift: shiftId,
    active: true,
    createdBy: admin?._id ?? null,
    updatedAt: now,
  }
  if (profile.terminated) {
    data.active = false
    data.terminationDate = new Date(`${profile.terminationDate}T12:00:00.000Z`)
    data.terminationReason = profile.terminationReason
  }

  if (existing) {
    await employees.updateOne({ _id: existing._id }, { $set: data })
    updatedEmployees++
    return { _id: existing._id, profile, data }
  }
  const result = await employees.insertOne({ ...data, createdAt: now })
  createdEmployees++
  return { _id: result.insertedId, profile, data }
}

for (const profile of profiles) {
  const employee = await upsertEmployee(profile)
  // Los empleados dados de baja no entran en la generación de nómina/asistencia.
  if (!profile.terminated) {
    demoEmployeeIds.push(employee._id)
    demoEmployees.push(employee)
  }
}

// Empleado existente (Alfredo Marco): asegura turno/ARL y entra a la demo.
const existingEmployee = await employees.findOne({
  tenantId: company._id,
  document: '564387563245',
})
if (existingEmployee) {
  await employees.updateOne(
    { _id: existingEmployee._id },
    { $set: { assignedShift: dayShiftId, arlRiskClass: 1, active: true, updatedAt: now } },
  )
  demoEmployeeIds.push(existingEmployee._id)
  demoEmployees.push({
    _id: existingEmployee._id,
    profile: {
      document: existingEmployee.document,
      firstName: existingEmployee.firstName,
      lastName: existingEmployee.lastName,
      baseSalary: existingEmployee.baseSalary ?? 2500000,
      shiftType: DAY,
      overtimeWeekdays: [],
      absences: [],
    },
  })
} else {
  console.warn('No se encontró el empleado existente (Alfredo Marco); se omite.')
}

// ------------------------------------------------------------- utilidades
const getWorkdays = (monthInfo) => {
  const daysInMonth = new Date(monthInfo.year, monthInfo.month, 0).getDate()
  const result = []
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${monthInfo.year}-${pad(monthInfo.month)}-${pad(day)}`
    const weekday = new Date(`${dateStr}T12:00:00-05:00`).getDay()
    if (weekday === 0 || weekday === 6) continue
    result.push({
      day,
      dateStr,
      weekday,
      week: Math.floor((day - 1) / 7),
    })
  }
  return result
}

const buildAttendance = (employee, profile, workday) => {
  const { dateStr, weekday } = workday
  const hasOvertime = (profile.overtimeWeekdays ?? []).includes(weekday)
  const isAfternoon = profile.shiftType === AFTERNOON
  const clockIn = new Date(
    `${dateStr}T${isAfternoon ? '13:00' : '08:00'}:00-05:00`,
  )
  const clockOut = new Date(
    `${dateStr}T${isAfternoon ? (hasOvertime ? '22:00' : '21:00') : hasOvertime ? '18:00' : '16:00'}:00-05:00`,
  )
  const { dayHours, nightHours } = splitDayNightHours(
    clockIn,
    clockOut,
    NIGHT_START,
    NIGHT_END,
  )
  const { overtimeDayHours, overtimeNightHours } = splitOvertimeFromEnd(
    clockIn,
    clockOut,
    REGULAR_DAILY_HOURS,
    NIGHT_START,
    NIGHT_END,
  )
  return {
    employee: employee._id,
    tenantId: company._id,
    date: new Date(`${dateStr}T12:00:00.000Z`),
    clockIn,
    clockOut,
    hoursWorked: round2(dayHours + nightHours),
    dayHours,
    nightHours,
    overtimeDayHours,
    overtimeNightHours,
    nightSurcharge: round2(nightHours * NIGHT_SURCHARGE_RATE),
    assignedShift: isAfternoon ? afternoonShiftId : dayShiftId,
    status: 'approved',
    observations: hasOvertime ? 'Jornada con horas extra' : undefined,
    recordedBy: admin?._id ?? null,
    createdAt: now,
    updatedAt: now,
  }
}

const getAbsenceDays = (type, start, end, dayOff = 0) => {
  if (
    [
      ABSENCE_TYPES.INCAPACIDAD_COMUN,
      ABSENCE_TYPES.INCAPACIDAD_LABORAL,
      ABSENCE_TYPES.VACACIONES,
      ABSENCE_TYPES.DESCANSO_COMPENSATORIO,
      ABSENCE_TYPES.SIN_REMUNERAR,
    ].includes(type)
  ) {
    return Math.round((end - start) / 86400000) + 1
  }
  let days = 0
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    if (cursor.getDay() !== dayOff) days++
  }
  return days
}

const dailySalary = (baseSalary) => round2(baseSalary / 30)

const buildAbsenceValues = (type, baseSalary, days) => {
  if (type === ABSENCE_TYPES.INCAPACIDAD_COMUN) {
    const employerDays = Math.min(
      legal.employerPaidIncapacidadDays ?? DEFAULT_EMPLOYER_PAID_INCAPACIDAD_DAYS,
      days,
    )
    const percent = legal.incapacidadComunDailyPercent ?? INCAPACIDAD_COMUN_DAILY_PERCENT
    const daily = dailySalary(baseSalary)
    return {
      paidByCompanyDays: employerDays,
      companyPaidValue: round2(employerDays * daily * percent),
      epsValue: round2((days - employerDays) * daily * percent),
      arlValue: 0,
      surchargePaid: false,
    }
  }
  if (type === ABSENCE_TYPES.INCAPACIDAD_LABORAL) {
    return {
      paidByCompanyDays: 0,
      companyPaidValue: 0,
      epsValue: 0,
      arlValue: round2(days * dailySalary(baseSalary)),
      surchargePaid: false,
    }
  }
  return {
    paidByCompanyDays: 0,
    companyPaidValue: 0,
    epsValue: 0,
    arlValue: 0,
    surchargePaid: false,
  }
}

const getMonthAbsences = async (monthInfo) => {
  const cursor = absences.find({
    employee: { $in: demoEmployeeIds },
    status: 'approved',
    startDate: { $lte: monthInfo.end },
    endDate: { $gte: monthInfo.start },
  })
  return cursor.toArray()
}

const getAttendanceSummary = async (employeeId, monthInfo) => {
  const rows = await attendances
    .aggregate([
      {
        $match: {
          employee: employeeId,
          date: { $gte: monthInfo.start, $lte: monthInfo.end },
        },
      },
      {
        $group: {
          _id: null,
          days: { $sum: 1 },
          hoursWorked: { $sum: '$hoursWorked' },
          overtimeDayHours: { $sum: '$overtimeDayHours' },
          overtimeNightHours: { $sum: '$overtimeNightHours' },
          nightSurcharge: { $sum: '$nightSurcharge' },
        },
      },
    ])
    .toArray()
  return (
    rows[0] ?? {
      days: 0,
      hoursWorked: 0,
      overtimeDayHours: 0,
      overtimeNightHours: 0,
      nightSurcharge: 0,
    }
  )
}

// Cálculo idéntico al servicio de producción (payroll.service.ts).
const buildPayrollEntry = async (employee, monthInfo) => {
  const profile = employee.profile
  const baseSalary = profile.baseSalary
  const summary = await getAttendanceSummary(employee._id, monthInfo)
  const monthAbsences = await getMonthAbsences(monthInfo)
  const employeeAbsences = monthAbsences.filter(
    (absence) => String(absence.employee) === String(employee._id),
  )

  let paidAbsenceDays = 0
  let absenceCompanyPaidValue = 0
  let absenceEpsValue = 0
  let absenceArlValue = 0
  for (const absence of employeeAbsences) {
    if (REMUNERATED_ABSENCE_TYPES.includes(absence.type)) {
      paidAbsenceDays += absence.days ?? 0
    } else if (absence.type === ABSENCE_TYPES.INCAPACIDAD_COMUN) {
      absenceCompanyPaidValue += absence.companyPaidValue ?? 0
      absenceEpsValue += absence.epsValue ?? 0
    } else if (absence.type === ABSENCE_TYPES.INCAPACIDAD_LABORAL) {
      absenceArlValue += absence.arlValue ?? 0
    }
  }

  const periodDays =
    Math.round((monthInfo.end - monthInfo.start) / 86400000) + 1
  const daysWorked = Math.min(periodDays, summary.days + paidAbsenceDays)
  const factor = Math.min(1, daysWorked / periodDays)
  const devBaseSalary = round2(baseSalary * factor)
  const allowanceApplies = baseSalary > 0 && baseSalary < 2 * legal.minimumWage
  const transportAllowance = allowanceApplies
    ? round2((legal.transportAllowance ?? 0) * factor)
    : 0

  const baseHours = legal.baseHoursPerMonth ?? 240
  const hourlyRate = baseSalary / baseHours
  const overtimeDay = round2(summary.overtimeDayHours * hourlyRate * 1.25)
  const overtimeNight = round2(summary.overtimeNightHours * hourlyRate * 1.75)
  const nightSurcharge = round2(summary.nightSurcharge * hourlyRate)

  const devengados = {
    baseSalary: devBaseSalary,
    daysWorked,
    paidAbsenceDays,
    absenceCompanyPaidValue: round2(absenceCompanyPaidValue),
    absenceEpsValue: round2(absenceEpsValue),
    absenceArlValue: round2(absenceArlValue),
    transportAllowance,
    overtimeDay,
    overtimeNight,
    nightSurcharge,
    bonuses: 0,
    commissions: 0,
    total: round2(
      devBaseSalary +
        transportAllowance +
        overtimeDay +
        overtimeNight +
        nightSurcharge +
        absenceCompanyPaidValue,
    ),
  }

  const ibc = round2(devBaseSalary + transportAllowance)
  const healthEmployeeRate = legal.healthPercentages?.employee ?? 0.04
  const pensionEmployeeRate = legal.pensionPercentages?.employee ?? 0.04
  const employeeHealth = round2(ibc * healthEmployeeRate)
  const employeePension = round2(ibc * pensionEmployeeRate)

  const uvt = legal.uvtValue || 1
  const uvtIncome = devBaseSalary / uvt
  const bracket = (legal.withholdingRates ?? []).find(
    (rate) => uvtIncome >= rate.from && uvtIncome <= rate.to,
  )
  const sourceRetention = bracket
    ? round2(Math.max(0, devBaseSalary - bracket.from * uvt) * (bracket.percentage / 100))
    : 0

  const deducciones = {
    employeeHealth,
    employeePension,
    sourceRetention,
    garnishments: 0,
    loans: 0,
    total: round2(employeeHealth + employeePension + sourceRetention),
  }

  const employerHealthRate = legal.healthPercentages?.employer ?? 0.085
  const employerPensionRate = legal.pensionPercentages?.employer ?? 0.12
  const arlRate =
    legal.arlRates?.[String(profile.arlRiskClass)] ?? 0
  const senaRate = legal.parafiscales?.sena ?? 0.02
  const icbfRate = legal.parafiscales?.icbf ?? 0.03
  const cajaRate = legal.parafiscales?.compensationFund ?? 0.04

  const seguridadSocial = {
    employerHealth: round2(ibc * employerHealthRate),
    employerPension: round2(ibc * employerPensionRate),
    arl: round2(devBaseSalary * arlRate),
    sena: round2(ibc * senaRate),
    icbf: round2(ibc * icbfRate),
    compensationFund: round2(ibc * cajaRate),
    total: round2(
      ibc * employerHealthRate +
        ibc * employerPensionRate +
        devBaseSalary * arlRate +
        ibc * senaRate +
        ibc * icbfRate +
        ibc * cajaRate,
    ),
  }

  return {
    employee: employee._id,
    devengados,
    deducciones,
    seguridadSocial,
    totalToPay: Math.max(0, round2(devengados.total - deducciones.total)),
    observations: employeeAbsences.length
      ? `${employeeAbsences.length} ausencia(s) aprobada(s) en el período`
      : undefined,
  }
}

// --------------------------------------------------------- mes por mes
const monthLog = []
let totalAttendance = 0
let totalAbsences = 0
let totalPayrolls = 0

// Limpieza general de la ventana demo: elimina cualquier nómina (aprobada o
// borrador) cuyo período intersecte la ventana, incluidos los períodos con
// fechas mal cortadas de ejecuciones anteriores (ej. 01/MM → 01/MM+1).
const firstMonth = months[0]
const lastMonth = months[months.length - 1]
const cleanupRange = {
  start: new Date(`${firstMonth.year}-${pad(firstMonth.month)}-01T00:00:00.000Z`),
  // Cubre también períodos mal cortados que terminan el día 1 del mes siguiente.
  end: new Date(
    `${lastMonth.month === 12 ? lastMonth.year + 1 : lastMonth.year}-${pad(lastMonth.month === 12 ? 1 : lastMonth.month + 1)}-01T00:00:00.000Z`,
  ),
}
const cleaned = await payrolls.deleteMany({
  tenantId: company._id,
  periodStart: { $lte: cleanupRange.end },
  periodEnd: { $gte: cleanupRange.start },
})
console.log(`nóminas previas de la ventana eliminadas: ${cleaned.deletedCount}`)

for (const monthInfo of months) {
  const workdays = getWorkdays(monthInfo)

  // Limpieza idempotente del mes.
  await attendances.deleteMany({
    employee: { $in: demoEmployeeIds },
    date: { $gte: monthInfo.start, $lte: monthInfo.end },
  })
  await absences.deleteMany({
    employee: { $in: demoEmployeeIds },
    startDate: { $gte: monthInfo.start },
    endDate: { $lte: monthInfo.end },
  })
  await payrolls.deleteMany({
    tenantId: company._id,
    periodStart: monthInfo.start,
    periodEnd: monthInfo.end,
  })

  // Ausencias del mes.
  const absenceDocs = []
  for (const employee of demoEmployees) {
    const rules = (employee.profile.absences ?? []).filter(
      (rule) => rule[0] === monthInfo.offset,
    )
    for (const rule of rules) {
      const [, type, startDay, endDay] = rule
      const startDate = new Date(
        `${monthInfo.year}-${pad(monthInfo.month)}-${pad(startDay)}T12:00:00.000Z`,
      )
      const endDate = new Date(
        `${monthInfo.year}-${pad(monthInfo.month)}-${pad(endDay)}T12:00:00.000Z`,
      )
      const days = getAbsenceDays(type, startDate, endDate, 0)
      const values = buildAbsenceValues(
        type,
        employee.profile.baseSalary,
        days,
      )
      absenceDocs.push({
        tenantId: company._id,
        employee: employee._id,
        type,
        startDate,
        endDate,
        days,
        ...values,
        scheduledRestDate: null,
        supportDocument: type === ABSENCE_TYPES.INCAPACIDAD_COMUN ? 'incapacidad.pdf' : undefined,
        observations: `Ausencia demo: ${type}`,
        status: 'approved',
        approvedBy: admin?._id ?? null,
        approvedAt: now,
        createdBy: admin?._id ?? null,
        createdAt: now,
        updatedAt: now,
      })
    }
  }
  if (absenceDocs.length) await absences.insertMany(absenceDocs)

  // Asistencias (se salta TODOS los días cubiertos por cada ausencia).
  const absenceDates = new Set()
  for (const absence of absenceDocs) {
    for (
      let cursor = new Date(absence.startDate);
      cursor <= absence.endDate;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      const key = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`
      absenceDates.add(key)
    }
  }
  const attendanceDocs = []
  for (const employee of demoEmployees) {
    const profile = employee.profile
    for (const workday of workdays) {
      const dateKey = `${monthInfo.year}-${pad(monthInfo.month)}-${pad(workday.day)}`
      if (absenceDates.has(dateKey)) continue
      attendanceDocs.push(buildAttendance(employee, profile, workday))
    }
  }
  if (attendanceDocs.length) await attendances.insertMany(attendanceDocs)

  // Nómina del mes.
  const entries = await Promise.all(
    demoEmployees.map((employee) => buildPayrollEntry(employee, monthInfo)),
  )
  const totalEarned = round2(entries.reduce((acc, entry) => acc + entry.devengados.total, 0))
  const totalDeducted = round2(
    entries.reduce((acc, entry) => acc + entry.deducciones.total, 0),
  )
  const totalSocialSecurity = round2(
    entries.reduce((acc, entry) => acc + entry.seguridadSocial.total, 0),
  )
  const totalToPay = round2(
    entries.reduce((acc, entry) => acc + entry.totalToPay, 0),
  )

  await payrolls.insertOne({
    tenantId: company._id,
    periodStart: monthInfo.start,
    periodEnd: monthInfo.end,
    status: monthInfo.status,
    employees: entries,
    totalEarned,
    totalDeducted,
    totalSocialSecurity,
    totalToPay,
    createdBy: admin?._id ?? null,
    ...(monthInfo.status === 'approved'
      ? { approvedBy: admin?._id ?? null, approvedAt: now }
      : {}),
    createdAt: now,
    updatedAt: now,
  })

  monthLog.push(
    `${monthInfo.label} · ${monthInfo.status} · ${entries.length} emp · dev $${totalEarned.toLocaleString('es-CO')} · neto $${totalToPay.toLocaleString('es-CO')} · ${attendanceDocs.length} asistencias · ${absenceDocs.length} ausencias`,
  )
  totalAttendance += attendanceDocs.length
  totalAbsences += absenceDocs.length
  totalPayrolls += 1
}

// ------------------------------------------------------------- resumen
console.log('------------------ resumen ------------------')
console.log(`empleados demo creados: ${createdEmployees}`)
console.log(`empleados demo actualizados: ${updatedEmployees}`)
console.log(`nóminas generadas: ${totalPayrolls} (3 aprobadas + 1 borrador)`)
console.log(`asistencias totales: ${totalAttendance}`)
console.log(`ausencias aprobadas totales: ${totalAbsences}`)
console.log('')
console.log('Mes por mes:')
for (const line of monthLog) console.log(`  ${line}`)
console.log('')
console.log('Dashboard: abre /reports para ver los 4 meses; el último mes')
console.log('  aparecerá con barra naranja "Borrador (provisional)" en la gráfica.')
console.log(
  `Usuarios demo (rol empleado): contraseña "${DEMO_PASSWORD}" para los correos demo.*@nomina.test`,
)

await mongoose.disconnect()
