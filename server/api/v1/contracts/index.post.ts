import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { createContract } from '~~/server/services/contract.service'
import { mongoIdSchema, validateWithSchema, z } from '~~/server/utils/validation-schemas'

const contractSchema = z.object({
  employeeId: mongoIdSchema,
  employmentPeriodId: mongoIdSchema,
  type: z.enum(['indefinite', 'fixed', 'work_labor', 'intern']),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  salary: z.number().positive(),
  position: z.string().optional(),
  documentUrl: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const { userId } = await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])
  const body = await readBody(event)
  const data = validateWithSchema(contractSchema, body)
  return createContract(data, userId)
})
