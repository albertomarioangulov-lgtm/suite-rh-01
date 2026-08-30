import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getEnabledFlags } from '~~/server/services/feature-flags.service'
import { getTenantId } from '~~/server/utils/tenant'

/** Flags activos del tenant del usuario. Acceso: admin, manager, hr, employee. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR, ROLES.EMPLOYEE])

  const tenantId = await getTenantId(event)
  if (!tenantId) {
    return { flags: [] }
  }

  const flags = await getEnabledFlags(tenantId)
  return { flags }
})
