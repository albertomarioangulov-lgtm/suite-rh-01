import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import { ModuleRequest } from '~~/server/models/ModuleRequest'

/** Solicitudes de módulos del tenant (visibles para el superadmin/AMAV). */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.SUPERADMIN])
  const tenantId = await getTenantId(event)
  if (!tenantId) return { items: [] }

  const items = await ModuleRequest.find({ tenantId })
    .sort({ status: 1, createdAt: -1 })
    .limit(100)
    .lean()

  return {
    items: items.map((request) => ({
      id: String(request._id),
      module: request.module,
      message: request.message ?? '',
      status: request.status,
      createdAt: request.createdAt,
    })),
  }
})
