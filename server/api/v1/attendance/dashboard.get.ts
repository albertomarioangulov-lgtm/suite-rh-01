import mongoose from 'mongoose'
import { Attendance } from '~~/server/models/Attendance'
import { Employee } from '~~/server/models/Employee'
import { ROLES } from '~~/shared/auth'
import { getTenantId, requireFlag } from '~~/server/utils/tenant'
import { FEATURE_FLAGS } from '~~/shared/feature-flags'

const round2 = (value: number) => Math.round(value * 100) / 100

/**
 * Dashboard de asistencia: resumen del período (horas, extras, estados),
 * serie diaria y top de empleados por horas trabajadas.
 * Acceso: admin, manager, hr.
 */
export default defineEventHandler(async (event) => {
  await requireFlag(
    event,
    [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR],
    FEATURE_FLAGS.ATTENDANCE,
  )

  const tenantId = await getTenantId(event)
  const empty = {
    summary: {
      records: 0,
      employees: 0,
      hoursWorked: 0,
      dayHours: 0,
      nightHours: 0,
      overtime: 0,
      overtimeDay: 0,
      overtimeNight: 0,
      nightSurcharge: 0,
      lateCount: 0,
    },
    statusCounts: { pending: 0, approved: 0, rejected: 0 },
    daily: [],
    topEmployees: [],
  }
  if (!tenantId) return empty

  const { dateFrom, dateTo, employeeId, status, search } = getQuery(event) as
    Record<string, string | undefined>
  let from: Date | null = null
  let to: Date | null = null
  if (dateFrom) from = new Date(dateFrom)
  if (dateTo) to = new Date(`${dateTo}T23:59:59.999Z`)
  if (!from && !to) {
    to = new Date()
    from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)
  }

  const dateFilter: Record<string, Date> = {}
  if (from) dateFilter.$gte = from
  if (to) dateFilter.$lte = to
  const match: Record<string, unknown> = { tenantId }
  // En agregaciones MongoDB no castea strings a ObjectId: se convierte
  // explícitamente (getTenantId devuelve string).
  if (mongoose.isValidObjectId(tenantId)) {
    match.tenantId = new mongoose.Types.ObjectId(tenantId)
  }
  if (dateFilter.$gte || dateFilter.$lte) match.date = dateFilter
  if (status) match.status = status
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const ids = await Employee.find({
      tenantId,
      $or: [
        { firstName: { $regex: escaped, $options: 'i' } },
        { lastName: { $regex: escaped, $options: 'i' } },
        { document: { $regex: escaped, $options: 'i' } },
      ],
    })
      .select('_id')
      .lean()
    match.employee = { $in: ids.map((employee) => employee._id) }
  } else if (employeeId && mongoose.isValidObjectId(employeeId)) {
    match.employee = new mongoose.Types.ObjectId(employeeId)
  }

  // Las agregaciones corren en paralelo para no acumular latencia de red
  // (cada una viaja a Atlas por separado).
  const [summaryRows, statusRows, daily, topRows] = await Promise.all([
    Attendance.aggregate<{
      records: number
      employees: Array<unknown>
      hoursWorked: number
      dayHours: number
      nightHours: number
      overtimeDay: number
      overtimeNight: number
      nightSurcharge: number
      lateCount: number
    }>([
      { $match: match },
      {
        $group: {
          _id: null,
          records: { $sum: 1 },
          employees: { $addToSet: '$employee' },
          hoursWorked: { $sum: { $ifNull: ['$hoursWorked', 0] } },
          dayHours: { $sum: { $ifNull: ['$dayHours', 0] } },
          nightHours: { $sum: { $ifNull: ['$nightHours', 0] } },
          overtimeDay: { $sum: { $ifNull: ['$overtimeDayHours', 0] } },
          overtimeNight: { $sum: { $ifNull: ['$overtimeNightHours', 0] } },
          nightSurcharge: { $sum: { $ifNull: ['$nightSurcharge', 0] } },
          lateCount: { $sum: { $ifNull: ['$isLate', false] } },
        },
      },
    ]),
    Attendance.aggregate<{
      _id: string
      count: number
    }>([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Attendance.aggregate<{
      _id: string
      records: number
      hoursWorked: number
      dayHours: number
      nightHours: number
      overtime: number
      overtimeDay: number
      overtimeNight: number
    }>([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$date',
              timezone: 'America/Bogota',
            },
          },
          records: { $sum: 1 },
          hoursWorked: { $sum: { $ifNull: ['$hoursWorked', 0] } },
          dayHours: { $sum: { $ifNull: ['$dayHours', 0] } },
          nightHours: { $sum: { $ifNull: ['$nightHours', 0] } },
          overtime: {
            $sum: {
              $ifNull: [
                { $add: ['$overtimeDayHours', '$overtimeNightHours'] },
                0,
              ],
            },
          },
          overtimeDay: { $sum: { $ifNull: ['$overtimeDayHours', 0] } },
          overtimeNight: { $sum: { $ifNull: ['$overtimeNightHours', 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Attendance.aggregate<{
      _id: unknown
      hoursWorked: number
      records: number
    }>([
      { $match: match },
      {
        $group: {
          _id: '$employee',
          hoursWorked: { $sum: { $ifNull: ['$hoursWorked', 0] } },
          records: { $sum: 1 },
        },
      },
      { $sort: { hoursWorked: -1 } },
      { $limit: 8 },
    ]),
  ])

  const summary = summaryRows[0]
  const statusCounts = { pending: 0, approved: 0, rejected: 0 }
  for (const row of statusRows) {
    const status = row._id as keyof typeof statusCounts
    if (status in statusCounts) statusCounts[status] = row.count
  }

  const employees = await Employee.find({
    _id: { $in: topRows.map((row) => row._id) },
  })
    .select('firstName lastName')
    .lean()
  const nameById = new Map(
    employees.map((employee) => [
      String(employee._id),
      `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() ||
        'Empleado',
    ]),
  )
  const topEmployees = topRows.map((row) => ({
    employeeId: String(row._id),
    name: nameById.get(String(row._id)) ?? 'Empleado',
    hoursWorked: round2(row.hoursWorked),
    records: row.records,
  }))

  return {
    summary: summary
      ? {
          records: summary.records,
          employees: summary.employees.length,
          hoursWorked: round2(summary.hoursWorked),
          dayHours: round2(summary.dayHours),
          nightHours: round2(summary.nightHours),
          overtime: round2(summary.overtimeDay + summary.overtimeNight),
          overtimeDay: round2(summary.overtimeDay),
          overtimeNight: round2(summary.overtimeNight),
          nightSurcharge: round2(summary.nightSurcharge),
          lateCount: summary.lateCount ?? 0,
        }
      : empty.summary,
    statusCounts,
    daily: daily.map((item) => ({
      date: item._id,
      records: item.records,
      hoursWorked: round2(item.hoursWorked),
      dayHours: round2(item.dayHours),
      nightHours: round2(item.nightHours),
      overtime: round2(item.overtime),
      overtimeDay: round2(item.overtimeDay),
      overtimeNight: round2(item.overtimeNight),
    })),
    topEmployees,
  }
})
