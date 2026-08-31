import { User } from '~~/server/models/User'
import { Employee } from '~~/server/models/Employee'
import { requireAuth } from '~~/server/utils/authorize'
import { syncUserTenants } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event)

  // Multi-tenant: sincroniza la lista de empresas del usuario (empleados).
  await syncUserTenants(userId)

  const user = await User.findById(userId)
  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'Usuario no encontrado',
    })
  }

  const employee = await Employee.findOne({ user: userId }).select('_id').lean()

  return {
    ...user.toJSON(),
    employeeId: employee ? String(employee._id) : null,
  }
})
