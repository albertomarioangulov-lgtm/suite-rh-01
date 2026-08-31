import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { renewContract } from '~~/server/services/contract.service'
import { mongoIdSchema, validateWithSchema, z } from '~~/server/utils/validation-schemas'

const renewSchema = z.object({
  endDate: z.coerce.date(),
  salary: z.number().positive().optional(),
  position: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const { userId } = await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])
  const id = validateWithSchema(mongoIdSchema, getRouterParam(event, 'id') || '')
  const body = await readBody(event)
  const data = validateWithSchema(renewSchema, body)
  return renewContract(id, data, userId)
})
