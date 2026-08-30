import { User } from '~~/server/models/User'
import { Employee } from '~~/server/models/Employee'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'

/**
 * Usuarios con rol employee disponibles para vincular como empleado.
 * Excluye los que ya están asociados a un empleado de la empresa.
 * Acceso: admin, manager, hr.
 */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])

  const tenantId = await getTenantId(event)
  if (!tenantId) return []

  const linked = await Employee.find({ tenantId })
    .select('user')
    .lean()
  const linkedIds = linked
    .map((item) => item.user)
    .filter((id): id is NonNullable<typeof id> => !!id)

  const users = await User.find({
    role: ROLES.EMPLOYEE,
    active: true,
    _id: { $nin: linkedIds },
  })
    .select('name email')
    .sort({ name: 1 })
    .lean()

  return users.map((user) => ({
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
  }))
})
