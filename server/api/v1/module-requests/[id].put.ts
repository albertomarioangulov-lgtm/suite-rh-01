import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import {
  mongoIdSchema,
  validateWithSchema,
  z,
} from '~~/server/utils/validation-schemas'
import { ModuleRequest } from '~~/server/models/ModuleRequest'

const statusSchema = z.object({
  status: z.enum(['handled']),
})

/** Marca una solicitud como atendida (superadmin/AMAV). */
export default defineEventHandler(async (event) => {
  const { userId } = await authorize(event, [ROLES.SUPERADMIN])
  const tenantId = await getTenantId(event)
  const id = validateWithSchema(mongoIdSchema, getRouterParam(event, 'id') || '')
  const data = validateWithSchema(statusSchema, await readBody(event))

  const request = await ModuleRequest.findOne({ _id: id, tenantId })
  if (!request) {
    throw createError({
      statusCode: 404,
      message: 'Solicitud no encontrada',
    })
  }
  request.status = data.status
  request.handledBy = userId
  request.handledAt = new Date()
  await request.save()
  return { id, status: request.status }
})
