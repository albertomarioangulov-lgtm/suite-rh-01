import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import { Position } from '~~/server/models/Position'

export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN])
  const tenantId = await getTenantId(event)
  const id = String(getRouterParam(event, 'id') ?? '')

  const result = await Position.deleteOne({ _id: id, tenantId })
  if (result.deletedCount === 0) {
    throw createError({ statusCode: 404, message: 'Cargo no encontrado' })
  }
  return { success: true }
})
