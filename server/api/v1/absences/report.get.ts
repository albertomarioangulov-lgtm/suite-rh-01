import { Absence } from '~~/server/models/Absence'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { validateWithSchema, z } from '~~/server/utils/validation-schemas'

const reportSchema = z.object({
  dateFrom: z.string().trim().min(1, 'dateFrom es requerido'),
  dateTo: z.string().trim().min(1, 'dateTo es requerido'),
  employeeId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID inválido').optional(),
})

/**
 * Reporte de ausencias: totales y días por tipo en un rango de fechas.
 * Acceso: admin, manager, hr.
 */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])

  const query = validateWithSchema(reportSchema, getQuery(event))
  const filter: Record<string, unknown> = {
    status: 'approved',
    startDate: { $lte: new Date(`${query.dateTo}T23:59:59.999Z`) },
    endDate: { $gte: new Date(`${query.dateFrom}T00:00:00.000Z`) },
  }
  if (query.employeeId) filter.employee = query.employeeId

  const absences = await Absence.find(filter).lean()
  const byType = new Map<string, { count: number; days: number }>()
  let totalDays = 0

  for (const absence of absences) {
    const key = String(absence.type)
    const current = byType.get(key) ?? { count: 0, days: 0 }
    current.count += 1
    current.days += absence.days ?? 0
    byType.set(key, current)
    totalDays += absence.days ?? 0
  }

  return {
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    employeeId: query.employeeId,
    totalAbsences: absences.length,
    totalDays,
    byType: Object.fromEntries(byType),
  }
})
