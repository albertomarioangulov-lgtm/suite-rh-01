import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { validateWithSchema, z } from '~~/server/utils/validation-schemas'
import { getAnalyticsOverview } from '~~/server/services/analytics.service'
import { getTenantId } from '~~/server/utils/tenant'

const overviewSchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
})

/** Indicadores del dashboard de RRHH para un mes. Acceso: admin, manager, hr. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])
  const tenantId = await getTenantId(event)
  const query = validateWithSchema(overviewSchema, getQuery(event))
  return getAnalyticsOverview({ ...query, tenantId })
})
