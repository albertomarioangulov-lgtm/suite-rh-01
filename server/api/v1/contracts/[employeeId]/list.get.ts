import { Employee } from '~~/server/models/Employee'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getEmployeeContracts } from '~~/server/services/contract.service'
import { mongoIdSchema, validateWithSchema } from '~~/server/utils/validation-schemas'

export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])
  const employeeId = validateWithSchema(
    mongoIdSchema,
    getRouterParam(event, 'employeeId') || '',
  )
  const contracts = await getEmployeeContracts(employeeId)
  return { items: contracts.map((contract) => contract.toJSON()) }
})
