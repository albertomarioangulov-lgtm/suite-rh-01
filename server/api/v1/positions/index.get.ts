import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import { Position } from '~~/server/models/Position'

/** Lista de cargos del catálogo, opcionalmente filtrados por área. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])
  const tenantId = await getTenantId(event)
  const departmentId = getQuery(event).departmentId

  const filter: Record<string, unknown> = { tenantId }
  if (departmentId) filter.department = departmentId

  const positions = await Position.find(filter)
    .sort({ title: 1 })
    .populate('department', 'name')
    .lean()

  return {
    items: positions.map((position) => ({
      id: String(position._id),
      title: position.title,
      departmentId: position.department?._id
        ? String(position.department._id)
        : null,
      department: position.department?.name ?? '',
      description: position.description ?? '',
      functions: position.functions ?? [],
      requirements: position.requirements ?? [],
      minSalary: position.minSalary ?? null,
      maxSalary: position.maxSalary ?? null,
      active: position.active,
    })),
  }
})
