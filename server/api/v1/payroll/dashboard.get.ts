import mongoose from 'mongoose'
import type { QueryFilter } from 'mongoose'
import { Payroll, type IPayroll } from '~~/server/models/Payroll'
import { ROLES } from '~~/shared/auth'
import { getTenantId, requireFlag } from '~~/server/utils/tenant'
import { FEATURE_FLAGS } from '~~/shared/feature-flags'

const round2 = (value: number) => Math.round(value * 100) / 100

type PayrollStatus = IPayroll['status']

/**
 * Dashboard general del módulo de nómina: conteos y montos por estado,
 * empleados liquidados, promedio neto y evolución de las últimas nóminas.
 * Acceso: admin, manager, hr.
 */
export default defineEventHandler(async (event) => {
  await requireFlag(
    event,
    [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR],
    FEATURE_FLAGS.PAYROLL,
  )

  const tenantId = await getTenantId(event)
  const empty = {
    counts: { draft: 0, approved: 0, paid: 0, cancelled: 0 },
    totals: {
      totalEarned: 0,
      totalDeducted: 0,
      totalSocialSecurity: 0,
      totalToPay: 0,
    },
    statusAmounts: {
      draft: { count: 0, totalToPay: 0 },
      approved: { count: 0, totalToPay: 0 },
      paid: { count: 0, totalToPay: 0 },
      cancelled: { count: 0, totalToPay: 0 },
    },
    employeeCount: 0,
    averageNet: 0,
    evolution: [],
  }
  if (!tenantId) return empty

  const objectTenantId = new mongoose.Types.ObjectId(tenantId)

  // Las consultas corren en paralelo para no acumular latencia de red.
  const [statusAgg, employeeAgg, recent] = await Promise.all([
    Payroll.aggregate<{
      _id: string
      count: number
      totalEarned: number
      totalDeducted: number
      totalSocialSecurity: number
      totalToPay: number
    }>([
      // En agregaciones MongoDB no castea strings a ObjectId: se convierte
      // explícitamente (getTenantId devuelve string).
      { $match: { tenantId: objectTenantId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalEarned: { $sum: { $ifNull: ['$totalEarned', 0] } },
          totalDeducted: { $sum: { $ifNull: ['$totalDeducted', 0] } },
          totalSocialSecurity: {
            $sum: { $ifNull: ['$totalSocialSecurity', 0] },
          },
          totalToPay: { $sum: { $ifNull: ['$totalToPay', 0] } },
        },
      },
    ]),
    Payroll.aggregate<{
      _id: null
      ids: Array<unknown>
    }>([
      {
        $match: {
          tenantId: objectTenantId,
          status: { $ne: 'cancelled' },
        },
      },
      { $unwind: '$employees' },
      { $group: { _id: null, ids: { $addToSet: '$employees.employee' } } },
    ]),
    Payroll.find({
      tenantId,
    } satisfies QueryFilter<IPayroll>)
      .sort({ periodStart: -1 })
      .limit(8)
      .select('periodStart periodEnd status totalToPay totalEarned employees')
      .lean(),
  ])

  const counts: Record<PayrollStatus, number> = {
    draft: 0,
    approved: 0,
    paid: 0,
    cancelled: 0,
  }
  const statusAmounts: Record<
    PayrollStatus,
    { count: number; totalToPay: number }
  > = {
    draft: { count: 0, totalToPay: 0 },
    approved: { count: 0, totalToPay: 0 },
    paid: { count: 0, totalToPay: 0 },
    cancelled: { count: 0, totalToPay: 0 },
  }
  const totals = {
    totalEarned: 0,
    totalDeducted: 0,
    totalSocialSecurity: 0,
    totalToPay: 0,
  }

  for (const row of statusAgg) {
    const status = (row._id as PayrollStatus) ?? 'draft'
    counts[status] = row.count
    statusAmounts[status] = {
      count: row.count,
      totalToPay: round2(row.totalToPay),
    }
    if (status !== 'cancelled') {
      totals.totalEarned = round2(totals.totalEarned + row.totalEarned)
      totals.totalDeducted = round2(totals.totalDeducted + row.totalDeducted)
      totals.totalSocialSecurity = round2(
        totals.totalSocialSecurity + row.totalSocialSecurity,
      )
      totals.totalToPay = round2(totals.totalToPay + row.totalToPay)
    }
  }

  const employeeCount = employeeAgg[0]?.ids?.length ?? 0

  const activeRecent = recent.filter((item) => item.status !== 'cancelled')
  const averageNet = activeRecent.length
    ? round2(
        activeRecent.reduce((sum, item) => sum + (item.totalToPay ?? 0), 0) /
          activeRecent.length,
      )
    : 0

  const evolution = recent
    .map((item) => ({
      _id: String(item._id),
      periodStart: item.periodStart,
      periodEnd: item.periodEnd,
      status: item.status,
      totalToPay: item.totalToPay ?? 0,
      totalEarned: item.totalEarned ?? 0,
      employeeCount: (item.employees ?? []).length,
    }))
    .reverse()

  return {
    counts,
    totals,
    statusAmounts,
    employeeCount,
    averageNet,
    evolution,
  }
})
