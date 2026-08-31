import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import { Department } from '~~/server/models/Department'
import { Employee } from '~~/server/models/Employee'

export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN])
  const tenantId = await getTenantId(event)
  const id = String(getRouterParam(event, 'id') ?? '')

  const assigned = await Employee.countDocuments({ tenantId, department: id })
  if (assigned > 0) {
    throw createError({
      statusCode: 400,
      message: `No se puede eliminar: el área tiene ${assigned} empleado(s) asignado(s).`,
    })
  }

  const result = await Department.deleteOne({ _id: id, tenantId })
  if (result.deletedCount === 0) {
    throw createError({ statusCode: 404, message: 'Área no encontrada' })
  }
  return { success: true }
})
