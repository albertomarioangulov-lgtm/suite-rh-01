import { Types } from 'mongoose'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import { Alert } from '~~/server/models/Alert'
import { Absence } from '~~/server/models/Absence'
import { Attendance } from '~~/server/models/Attendance'
import { Employee } from '~~/server/models/Employee'
import { Payroll } from '~~/server/models/Payroll'

dayjs.extend(utc)

const round2 = (value: number) => Math.round(value * 100) / 100

interface IAnalyticsInput {
  month?: number
  year?: number
}

/**
 * Inicio y fin del mes consultado, calculados en UTC para que coincidan con
 * las fechas date-only que la app almacena a mediodía UTC (T12:00Z).
 */
const getMonthRange = (month: number, year: number) => ({
  start: dayjs
    .utc(new Date(Date.UTC(year, month - 1, 1)))
    .startOf('month')
    .toDate(),
  end: dayjs
    .utc(new Date(Date.UTC(year, month, 0, 12)))
    .endOf('month')
    .toDate(),
})

/** Mes anterior (UTC) para calcular variaciones. */
const getPreviousMonthRange = (month: number, year: number) => {
  const previous = dayjs
    .utc(new Date(Date.UTC(year, month - 1, 1)))
    .subtract(1, 'month')
  return getMonthRange(previous.month() + 1, previous.year())
}

/** Variación porcentual entre dos valores (null si no hay base). */
const variation = (current: number, previous: number): number | null =>
  previous > 0 ? round2(((current - previous) / previous) * 100) : null

/** Días hábiles del mes (lunes a sábado; domingo descanso por defecto). */
const getBusinessDays = (month: number, year: number) => {
  const daysInMonth = dayjs.utc(new Date(Date.UTC(year, month, 0))).date()
  let count = 0
  for (let day = 1; day <= daysInMonth; day += 1) {
    const weekday = dayjs.utc(new Date(Date.UTC(year, month - 1, day))).day()
    if (weekday !== 0) count += 1
  }
  return count
}

/**
 * Construye la matriz del heatmap de asistencia: por empleado y día de la
 * semana (0=domingo … 6=sábado) en el mes consultado.
 * Estados: 'present' (verde), 'justified' (amarillo, ausencia aprobada) y
 * 'missing' (rojo, sin registro ni justificación en día hábil).
 */
const buildHeatmap = (
  attendanceRows: Array<{
    _id: unknown
    dates?: string[]
    weekdays?: number[]
  }>,
  absenceRows: Array<{
    _id: unknown
    dates?: string[]
    endDates?: string[]
  }>,
  employeeMap: Map<string, { firstName?: string; lastName?: string }>,
  month: number,
  year: number,
) => {
  const daysInMonth = dayjs.utc(new Date(Date.UTC(year, month, 0))).date()
  const datesInMonth = Array.from({ length: daysInMonth }, (_, index) =>
    dayjs
      .utc(new Date(Date.UTC(year, month - 1, index + 1)))
      .format('YYYY-MM-DD'),
  )

  // Fechas con ausencia aprobada por empleado (rango start→end).
  const absenceDatesByEmployee = new Map<string, Set<string>>()
  for (const row of absenceRows) {
    const employeeId = String(row._id)
    const set = new Set<string>()
    const starts = row.dates ?? []
    const ends = row.endDates ?? []
    for (let index = 0; index < starts.length; index += 1) {
      const start = dayjs.utc(starts[index])
      const end = dayjs.utc(ends[index] ?? starts[index])
      let cursor = start
      while (!cursor.isAfter(end)) {
        set.add(cursor.format('YYYY-MM-DD'))
        cursor = cursor.add(1, 'day')
      }
    }
    absenceDatesByEmployee.set(employeeId, set)
  }

  // Fechas con asistencia registrada por empleado.
  const attendanceDatesByEmployee = new Map<string, Set<string>>()
  for (const row of attendanceRows) {
    attendanceDatesByEmployee.set(
      String(row._id),
      new Set((row.dates ?? []) as string[]),
    )
  }

  const employeeIds = Array.from(
    new Set([
      ...attendanceDatesByEmployee.keys(),
      ...absenceDatesByEmployee.keys(),
    ]),
  )

  return employeeIds.map((employeeId) => {
    const attendance = attendanceDatesByEmployee.get(employeeId) ?? new Set()
    const justified = absenceDatesByEmployee.get(employeeId) ?? new Set()
    // Estado por día de la semana: cuántos días de cada tipo en el mes.
    const weekdayCounts: Record<number, { present: number; justified: number; missing: number }> = {}
    for (let weekday = 0; weekday <= 6; weekday += 1) {
      weekdayCounts[weekday] = { present: 0, justified: 0, missing: 0 }
    }

    for (const date of datesInMonth) {
      const weekday = dayjs.utc(date).day()
      if (weekday === 0) continue // domingo: no se evalúa
      if (justified.has(date)) {
        weekdayCounts[weekday].justified += 1
      } else if (attendance.has(date)) {
        weekdayCounts[weekday].present += 1
      } else {
        weekdayCounts[weekday].missing += 1
      }
    }

    const employee = employeeMap.get(employeeId)
    return {
      employeeId,
      name: employee
        ? `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim()
        : 'Empleado',
      weekdays: weekdayCounts,
    }
  })
}

/**
 * Indicadores del dashboard de RRHH para un mes:
 * headcount, costos de nómina (con variación vs. mes anterior), ausentismo,
 * incapacidades, asistencia diaria y desglose por empleado.
 */
export const getAnalyticsOverview = async (
  input: IAnalyticsInput & { tenantId?: string | null } = {},
) => {
  const companyId = input.tenantId ?? null
  if (!companyId) {
    return {
      companyConfigured: false,
      headcount: null,
      payroll: null,
      absences: null,
      attendance: null,
      payrollPerEmployee: [],
      monthlySeries: [],
    }
  }
  const month = input.month ?? dayjs().month() + 1
  const year = input.year ?? dayjs().year()
  const { start, end } = getMonthRange(month, year)
  const previousRange = getPreviousMonthRange(month, year)
  const objectId = new Types.ObjectId(companyId)

  const monthStart = start
  const monthEnd = end

  const [
    totalEmployees,
    activeEmployees,
    contractBreakdown,
    positionBreakdown,
    previousMonthPayroll,
    monthPayroll,
    draftPayrolls,
    lastMonthsSeries,
    monthAbsences,
    monthAttendance,
    dailyAttendance,
    alertCount,
    topAbsences,
    attendanceHeatmap,
    absenceHeatmap,
    weeklyOvertime,
  ] = await Promise.all([
    Employee.countDocuments({ tenantId: companyId }),
    Employee.countDocuments({ tenantId: companyId, active: true }),
    Employee.aggregate([
      { $match: { tenantId: objectId } },
      { $group: { _id: '$contractType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Employee.aggregate([
      { $match: { tenantId: objectId } },
      { $group: { _id: '$position', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    Payroll.aggregate([
      {
        $match: {
          tenantId: objectId,
          status: { $in: ['approved', 'paid'] },
          periodStart: { $lte: previousRange.end },
          periodEnd: { $gte: previousRange.start },
        },
      },
      {
        $group: {
          _id: null,
          totalEarned: { $sum: '$totalEarned' },
          totalToPay: { $sum: '$totalToPay' },
        },
      },
    ]),
    Payroll.aggregate([
      {
        $match: {
          tenantId: objectId,
          status: { $in: ['approved', 'paid'] },
          periodStart: { $lte: end },
          periodEnd: { $gte: start },
        },
      },
      {
        $group: {
          _id: null,
          totalEarned: { $sum: '$totalEarned' },
          totalDeducted: { $sum: '$totalDeducted' },
          totalSocialSecurity: { $sum: '$totalSocialSecurity' },
          totalToPay: { $sum: '$totalToPay' },
          employeeCount: { $sum: { $size: '$employees' } },
        },
      },
    ]),
    Payroll.find({
      tenantId: companyId,
      status: 'draft',
      periodStart: { $lte: end },
      periodEnd: { $gte: start },
    })
      .select('periodStart periodEnd totalToPay employees')
      .sort({ periodStart: -1 })
      .lean(),
    buildMonthlySeries(companyId, month, year),
    Absence.aggregate([
      {
        $match: {
          tenantId: objectId,
          status: 'approved',
          startDate: { $lte: end },
          endDate: { $gte: start },
        },
      },
      {
        $group: {
          _id: '$type',
          days: { $sum: '$days' },
          count: { $sum: 1 },
        },
      },
      { $sort: { days: -1 } },
    ]),
    Attendance.aggregate([
      {
        $match: {
          tenantId: objectId,
          date: { $gte: start, $lte: end },
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
    ]),
    Attendance.aggregate([
      {
        $match: {
          tenantId: objectId,
          date: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          hoursWorked: { $sum: '$hoursWorked' },
          overtimeDayHours: { $sum: '$overtimeDayHours' },
          overtimeNightHours: { $sum: '$overtimeNightHours' },
          nightSurcharge: { $sum: '$nightSurcharge' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    // Alertas activas (sin leer) de la empresa.
    Alert.countDocuments({ tenantId: companyId, read: false }),
    // Top 5 empleados con más días de ausencia aprobada en el mes.
    Absence.aggregate([
      {
        $match: {
          tenantId: objectId,
          status: 'approved',
          startDate: { $lte: monthEnd },
          endDate: { $gte: monthStart },
        },
      },
      {
        $group: {
          _id: '$employee',
          days: { $sum: '$days' },
          count: { $sum: 1 },
        },
      },
      { $sort: { days: -1 } },
      { $limit: 5 },
    ]),
    // Heatmap de asistencia: registros por empleado en el mes.
    Attendance.aggregate([
      {
        $match: {
          tenantId: objectId,
          date: { $gte: monthStart, $lte: monthEnd },
        },
      },
      {
        $group: {
          _id: '$employee',
          dates: { $push: { $dateToString: { format: '%Y-%m-%d', date: '$date' } } },
          weekdays: { $push: { $dayOfWeek: '$date' } },
        },
      },
    ]),
    // Ausencias aprobadas por empleado en el mes (para marcar días justificados).
    Absence.aggregate([
      {
        $match: {
          tenantId: objectId,
          status: 'approved',
          startDate: { $lte: monthEnd },
          endDate: { $gte: monthStart },
        },
      },
      {
        $group: {
          _id: '$employee',
          dates: { $push: { $dateToString: { format: '%Y-%m-%d', date: '$startDate' } } },
          endDates: { $push: { $dateToString: { format: '%Y-%m-%d', date: '$endDate' } } },
        },
      },
    ]),
    // Horas extras de la semana actual (límite legal 12h semanales).
    Attendance.aggregate([
      {
        $match: {
          tenantId: objectId,
          date: {
            $gte: dayjs.utc().startOf('week').toDate(),
            $lte: dayjs.utc().endOf('week').toDate(),
          },
        },
      },
      {
        $group: {
          _id: null,
          overtimeDayHours: { $sum: '$overtimeDayHours' },
          overtimeNightHours: { $sum: '$overtimeNightHours' },
        },
      },
    ]),
  ])

  const monthlySeries = await addDraftPayrollsToSeries(lastMonthsSeries, companyId)

  const payroll =
    monthPayroll.length > 0
      ? {
          totalEarned: round2(monthPayroll[0].totalEarned ?? 0),
          totalDeducted: round2(monthPayroll[0].totalDeducted ?? 0),
          totalSocialSecurity: round2(monthPayroll[0].totalSocialSecurity ?? 0),
          totalToPay: round2(monthPayroll[0].totalToPay ?? 0),
          employeeCount: monthPayroll[0].employeeCount ?? 0,
          averageNet:
            (monthPayroll[0].employeeCount ?? 0) > 0
              ? round2((monthPayroll[0].totalToPay ?? 0) / monthPayroll[0].employeeCount)
              : 0,
          previousTotalToPay: round2(previousMonthPayroll[0]?.totalToPay ?? 0),
          previousTotalEarned: round2(previousMonthPayroll[0]?.totalEarned ?? 0),
          netVariation: variation(
            round2(monthPayroll[0].totalToPay ?? 0),
            round2(previousMonthPayroll[0]?.totalToPay ?? 0),
          ),
          earnedVariation: variation(
            round2(monthPayroll[0].totalEarned ?? 0),
            round2(previousMonthPayroll[0]?.totalEarned ?? 0),
          ),
        }
      : null

  const totalAbsenceDays = monthAbsences.reduce(
    (acc, item) => acc + (item.days ?? 0),
    0,
  )
  const incapacityDays = monthAbsences
    .filter((item) =>
      ['Incapacidad_Comun', 'Incapacidad_Laboral'].includes(String(item._id)),
    )
    .reduce((acc, item) => acc + (item.days ?? 0), 0)

  // Tasa de ausentismo: días de ausencia ÷ (activos × días hábiles del mes).
  const businessDays = getBusinessDays(month, year)
  const absenceRate =
    activeEmployees > 0 && businessDays > 0
      ? round2((totalAbsenceDays / (activeEmployees * businessDays)) * 100)
      : 0

  // Rotación últimos 12 meses: bajas ÷ plantilla promedio × 100.
  const twelveMonthsAgo = dayjs
    .utc(new Date(Date.UTC(year, month - 1, 1)))
    .subtract(12, 'month')
    .toDate()
  const terminations = await Employee.countDocuments({
    company: companyId,
    terminationDate: { $gte: twelveMonthsAgo, $lte: end },
    active: false,
  })
  const rotationRate =
    activeEmployees > 0
      ? round2((terminations / activeEmployees) * 100)
      : 0

  const incapacityBreakdown = {
    comun: {
      days:
        monthAbsences.find((item) => item._id === 'Incapacidad_Comun')?.days ?? 0,
      count:
        monthAbsences.find((item) => item._id === 'Incapacidad_Comun')?.count ?? 0,
    },
    laboral: {
      days:
        monthAbsences.find((item) => item._id === 'Incapacidad_Laboral')?.days ?? 0,
      count:
        monthAbsences.find((item) => item._id === 'Incapacidad_Laboral')?.count ?? 0,
    },
  }

  const payrollPerEmployee = await buildPayrollPerEmployee(companyId, start, end)

  // Top ausencias con nombre del empleado.
  const topAbsenceEmployeeIds = topAbsences.map(
    (item) => new Types.ObjectId(String(item._id)),
  )
  const topAbsenceEmployees = topAbsenceEmployeeIds.length
    ? await Employee.find({ _id: { $in: topAbsenceEmployeeIds } })
        .select('firstName lastName')
        .lean()
    : []
  const topAbsenceMap = new Map(
    topAbsenceEmployees.map((employee) => [String(employee._id), employee]),
  )
  const topAbsencesByName = topAbsences.map((item) => {
    const employee = topAbsenceMap.get(String(item._id))
    return {
      employeeId: String(item._id),
      name: employee ? `${employee.firstName} ${employee.lastName}` : 'Empleado',
      days: item.days ?? 0,
      count: item.count ?? 0,
    }
  })

  // Heatmap: empleados × días de la semana (0=domingo…6=sábado).
  const heatmapEmployeeIds = [
    ...attendanceHeatmap.map((item) => new Types.ObjectId(String(item._id))),
    ...absenceHeatmap.map((item) => new Types.ObjectId(String(item._id))),
  ]
  const heatmapEmployees = heatmapEmployeeIds.length
    ? await Employee.find({ _id: { $in: heatmapEmployeeIds } })
        .select('firstName lastName')
        .lean()
    : []
  const heatmapEmployeeMap = new Map(
    heatmapEmployees.map((employee) => [String(employee._id), employee]),
  )

  const heatmapRows = buildHeatmap(
    attendanceHeatmap,
    absenceHeatmap,
    heatmapEmployeeMap,
    month,
    year,
  )

  return {
    companyConfigured: true,
    period: { month, year },
    headcount: {
      totalEmployees,
      activeEmployees,
      terminations,
      rotationRate,
      byContractType: contractBreakdown.map((item) => ({
        type: item._id ?? 'sin_especificar',
        count: item.count,
      })),
      byPosition: positionBreakdown.map((item) => ({
        position: item._id ?? 'sin_cargo',
        count: item.count,
      })),
    },
    payroll,
    alerts: {
      active: alertCount,
    },
    overtime: {
      weekOvertimeHours: round2(
        (weeklyOvertime[0]?.overtimeDayHours ?? 0) +
          (weeklyOvertime[0]?.overtimeNightHours ?? 0),
      ),
      legalLimit: 12,
    },
    topAbsences: topAbsencesByName,
    heatmap: heatmapRows,
    draftPayrolls: draftPayrolls.map((item) => ({
      _id: String(item._id),
      periodStart: item.periodStart,
      periodEnd: item.periodEnd,
      totalToPay: round2(item.totalToPay ?? 0),
      employeeCount: (item.employees ?? []).length,
    })),
    absences: {
      totalApproved: monthAbsences.reduce((acc, item) => acc + (item.count ?? 0), 0),
      totalDays: totalAbsenceDays,
      incapacityDays,
      rate: absenceRate,
      byType: monthAbsences.map((item) => ({
        type: item._id,
        days: item.days ?? 0,
        count: item.count ?? 0,
      })),
      incapacityBreakdown,
    },
    attendance:
      monthAttendance.length > 0
        ? {
            days: monthAttendance[0].days ?? 0,
            hoursWorked: round2(monthAttendance[0].hoursWorked ?? 0),
            overtimeDayHours: round2(monthAttendance[0].overtimeDayHours ?? 0),
            overtimeNightHours: round2(monthAttendance[0].overtimeNightHours ?? 0),
            nightSurcharge: round2(monthAttendance[0].nightSurcharge ?? 0),
            dailySeries: dailyAttendance.map((item) => ({
              date: String(item._id ?? ''),
              hoursWorked: round2(item.hoursWorked ?? 0),
              overtimeDayHours: round2(item.overtimeDayHours ?? 0),
              overtimeNightHours: round2(item.overtimeNightHours ?? 0),
            })),
          }
        : {
            days: 0,
            hoursWorked: 0,
            overtimeDayHours: 0,
            overtimeNightHours: 0,
            nightSurcharge: 0,
            dailySeries: [],
          },
    payrollPerEmployee,
    monthlySeries,
  }
}

/** Serie de los últimos 12 meses: devengado, deducido y neto por mes. */
const buildMonthlySeries = async (
  companyId: string,
  currentMonth: number,
  currentYear: number,
) => {
  const series = []
  const cursor = dayjs.utc(new Date(Date.UTC(currentYear, currentMonth - 1, 1)))

  for (let i = 11; i >= 0; i -= 1) {
    const monthStart = cursor.subtract(i, 'month').startOf('month')
    const monthEnd = cursor.subtract(i, 'month').endOf('month')
    const rows = await Payroll.aggregate([
      {
        $match: {
          tenantId: new Types.ObjectId(companyId),
          status: { $in: ['approved', 'paid'] },
          periodStart: { $lte: monthEnd.toDate() },
          periodEnd: { $gte: monthStart.toDate() },
        },
      },
      {
        $group: {
          _id: null,
          totalEarned: { $sum: '$totalEarned' },
          totalToPay: { $sum: '$totalToPay' },
          totalDeducted: { $sum: '$totalDeducted' },
        },
      },
    ])

    series.push({
      month: monthStart.format('YYYY-MM'),
      label: monthStart.format('MMM'),
      totalEarned: round2(rows[0]?.totalEarned ?? 0),
      totalToPay: round2(rows[0]?.totalToPay ?? 0),
      totalDeducted: round2(rows[0]?.totalDeducted ?? 0),
      draftTotalToPay: 0,
    })
  }

  return series
}

/**
 * Enriquece la serie mensual con el valor de nóminas en borrador de cada mes
 * (se muestra en el gráfico como serie aparte, en otro color).
 */
export const addDraftPayrollsToSeries = async (
  series: Array<{
    month: string
    label: string
    totalEarned: number
    totalToPay: number
    totalDeducted: number
    draftTotalToPay?: number
  }>,
  companyId: string,
) => {
  const months = series.map((item) => item.month)
  const rows = await Payroll.aggregate([
    {
      $match: {
        tenantId: new Types.ObjectId(companyId),
        status: 'draft',
        periodStart: { $gte: new Date(`${months[0]}-01T00:00:00.000Z`) },
        periodEnd: {
          $lte: new Date(`${months[months.length - 1]}-31T23:59:59.999Z`),
        },
      },
    },
    {
      $group: {
        _id: {
          month: { $dateToString: { format: '%Y-%m', date: '$periodStart' } },
        },
        draftTotalToPay: { $sum: '$totalToPay' },
      },
    },
  ])

  const byMonth = new Map(
    rows.map((row) => [String(row._id?.month ?? ''), round2(row.draftTotalToPay ?? 0)]),
  )
  return series.map((item) => ({
    ...item,
    draftTotalToPay: byMonth.get(item.month) ?? 0,
  }))
}

/** Desglose de nómina por empleado del mes (para la tabla de drill-down). */
const buildPayrollPerEmployee = async (
  companyId: string,
  start: Date,
  end: Date,
) => {
  const rows = await Payroll.find({
    tenantId: companyId,
    status: { $in: ['approved', 'paid'] },
    periodStart: { $lte: end },
    periodEnd: { $gte: start },
  })
    .select('employees')
    .lean()

  const employeeIds = Array.from(
    new Set(
      rows.flatMap((row) =>
        (row.employees ?? []).map((entry: { employee?: unknown }) =>
          String(entry.employee ?? ''),
        ),
      ),
    ),
  ).filter(Boolean)

  const employeeDocs = await Employee.find({
    _id: { $in: employeeIds.map((id) => new Types.ObjectId(id)) },
  })
    .select('firstName lastName position baseSalary')
    .lean()
  const employeeMap = new Map(
    employeeDocs.map((employee) => [String(employee._id), employee]),
  )

  return rows.flatMap((row) =>
    (row.employees ?? []).map((entry) => {
      const employee = employeeMap.get(String(entry.employee ?? ''))
      const devengados = entry.devengados as Record<string, unknown> | undefined
      const deducciones = entry.deducciones as Record<string, unknown> | undefined
      const seguridadSocial = entry.seguridadSocial as
        | Record<string, unknown>
        | undefined
      return {
        employeeId: String(entry.employee ?? ''),
        name: employee ? `${employee.firstName} ${employee.lastName}` : 'Empleado',
        position: employee?.position ?? '—',
        baseSalary: employee?.baseSalary ?? 0,
        devengados: devengados ?? {},
        deducciones: deducciones ?? {},
        seguridadSocial: seguridadSocial ?? {},
        totalToPay: entry.totalToPay ?? 0,
      }
    }),
  )
}
