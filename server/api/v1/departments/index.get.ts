import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import { Department } from '~~/server/models/Department'

/** Lista de áreas del tenant. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])
  const tenantId = await getTenantId(event)
  const departments = await Department.find({ tenantId })
    .sort({ name: 1 })
    .populate('manager', 'firstName lastName')
    .lean()
  return {
    items: departments.map((department) => ({
      id: String(department._id),
      name: department.name,
      code: department.code ?? '',
      description: department.description ?? '',
      color: department.color ?? '#1867C0',
      managerId: department.manager?._id
        ? String(department.manager._id)
        : null,
      managerName: department.manager
        ? `${department.manager.firstName ?? ''} ${department.manager.lastName ?? ''}`.trim()
        : '',
      active: department.active,
    })),
  }
})
