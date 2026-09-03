import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import { mongoIdSchema, validateWithSchema } from '~~/server/utils/validation-schemas'
import { Site } from '~~/server/models/Site'
import { Employee } from '~~/server/models/Employee'

/** Detalle de una sede con conteos de empleados. Acceso: admin/manager/hr. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])
  const tenantId = await getTenantId(event)
  const id = validateWithSchema(mongoIdSchema, getRouterParam(event, 'id') || '')
  if (!tenantId) {
    throw createError({ statusCode: 409, message: 'Sin empresa activa.' })
  }

  const [site, employeeCount, activeEmployeeCount] = await Promise.all([
    Site.findOne({ _id: id, tenantId }).lean(),
    Employee.countDocuments({ tenantId, sedeId: id }),
    Employee.countDocuments({ tenantId, sedeId: id, active: true }),
  ])
  if (!site) {
    throw createError({ statusCode: 404, message: 'Sede no encontrada' })
  }

  return {
    id: String(site._id),
    name: site.name,
    code: site.code ?? '',
    city: site.city ?? '',
    municipalityCode: site.municipalityCode ?? '',
    address: site.address ?? '',
    phone: site.phone ?? '',
    isMain: site.isMain ?? false,
    active: site.active ?? true,
    sortOrder: site.sortOrder ?? 0,
    employeeCount,
    activeEmployeeCount,
  }
})
