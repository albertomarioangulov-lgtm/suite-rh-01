import { PayrollConcept } from '~~/server/models/PayrollConcept'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'

/** Lista los conceptos de nómina de la empresa. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])

  const tenantId = await getTenantId(event)
  const query = getQuery(event)
  const filter: Record<string, unknown> = { tenantId }
  if (query.type) filter.type = query.type
  if (query.active !== undefined) filter.active = query.active === 'true'
  if (query.search) {
    const search = String(query.search).trim()
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
    ]
  }

  const items = await PayrollConcept.find(filter)
    .sort({ type: 1, sortOrder: 1, name: 1 })
    .lean()
  return { items }
})
