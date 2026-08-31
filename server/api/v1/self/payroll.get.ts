import { requireAuth } from '~~/server/utils/authorize'
import { Employee } from '~~/server/models/Employee'
import { Payroll } from '~~/server/models/Payroll'

/**
 * Recibos de nómina del empleado vinculado al usuario (autoservicio).
 * Solo expone la fila del propio empleado en cada nómina.
 */
export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event)

  const employee = await Employee.findOne({ user: userId }).select('_id')
  if (!employee) {
    throw createError({
      statusCode: 404,
      message: 'No tienes una ficha de empleado vinculada a tu cuenta.',
    })
  }

  const payrolls = await Payroll.getByEmployee(String(employee._id))
  return payrolls.map((payroll) => {
    const entry = (payroll.employees ?? []).find(
      (item) => String(item.employee) === String(employee._id),
    )
    return {
      _id: String(payroll._id),
      periodStart: payroll.periodStart,
      periodEnd: payroll.periodEnd,
      status: payroll.status,
      totalEarned: entry?.devengados?.total ?? 0,
      totalDeducted: entry?.deducciones?.total ?? 0,
      totalSocialSecurity: entry?.seguridadSocial?.total ?? 0,
      totalToPay: entry?.totalToPay ?? 0,
      days: entry?.devengados?.daysWorked ?? 0,
      devengados: entry?.devengados ?? null,
      deducciones: entry?.deducciones ?? null,
      seguridadSocial: entry?.seguridadSocial ?? null,
    }
  })
})
