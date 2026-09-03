import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import { listSites } from '~~/server/services/site.service'

/** Sedes de la empresa. Acceso: admin/manager/hr (y superadmin). */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])
  const tenantId = await getTenantId(event)
  if (!tenantId) return { items: [] }
  const items = await listSites(tenantId)
  return { items }
})
