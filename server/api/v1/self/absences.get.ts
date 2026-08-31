import { requireAuth } from '~~/server/utils/authorize'
import { Employee } from '~~/server/models/Employee'
import { Absence } from '~~/server/models/Absence'

/**
 * Ausencias y permisos solicitados por el empleado vinculado al usuario
 * (autoservicio).
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

  const items = await Absence.find({ employee: employee._id })
    .sort({ startDate: -1, createdAt: -1 })
    .lean()

  return {
    items: items.map((item) => ({
      _id: String(item._id),
      type: item.type,
      startDate: item.startDate,
      endDate: item.endDate,
      days: item.days ?? 0,
      status: item.status,
      companyPaidValue: item.companyPaidValue ?? 0,
      epsValue: item.epsValue ?? 0,
      arlValue: item.arlValue ?? 0,
      observations: item.observations ?? '',
      rejectionReason: item.rejectionReason ?? '',
      createdAt: item.createdAt,
    })),
    total: items.length,
  }
})
