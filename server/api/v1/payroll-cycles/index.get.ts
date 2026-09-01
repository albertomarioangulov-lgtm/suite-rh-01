import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import { listCyclesWithCounts } from '~~/server/services/payroll-cycle.service'

/** Lista los ciclos de pago de la empresa con sus empleados. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])

  const tenantId = await getTenantId(event)
  return { items: await listCyclesWithCounts(String(tenantId)) }
})
