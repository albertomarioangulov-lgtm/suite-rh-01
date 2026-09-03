import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import { mongoIdSchema, validateWithSchema } from '~~/server/utils/validation-schemas'
import { Site } from '~~/server/models/Site'
import { Employee } from '~~/server/models/Employee'

/** Empleados de una sede. Acceso: admin/manager/hr (y superadmin). */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])
  const tenantId = await getTenantId(event)
  const id = validateWithSchema(mongoIdSchema, getRouterParam(event, 'id') || '')
  if (!tenantId) {
    return { items: [] }
  }

  const site = await Site.findOne({ _id: id, tenantId }).lean()
  if (!site) {
    throw createError({ statusCode: 404, message: 'Sede no encontrada' })
  }

  const employees = await Employee.find({ tenantId, sedeId: id })
    .sort({ lastName: 1, firstName: 1 })
    .select(
      'document documentType firstName lastName position department active',
    )
    .populate('department', 'name')
    .lean()

  return {
    items: employees.map((employee) => {
      const department =
        employee.department && typeof employee.department === 'object'
          ? (employee.department as { name?: string }).name ?? ''
          : ''
      return {
        id: String(employee._id),
        document: employee.document,
        documentType: employee.documentType ?? 13,
        firstName: employee.firstName,
        lastName: employee.lastName,
        position: employee.position,
        department,
        active: employee.active ?? true,
      }
    }),
  }
})
