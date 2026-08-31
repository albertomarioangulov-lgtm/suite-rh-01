import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import { validateWithSchema, z } from '~~/server/utils/validation-schemas'
import { Contract } from '~~/server/models/Contract'

const listSchema = z.object({
  status: z
    .enum(['active', 'expired', 'terminated', 'renewed'])
    .optional()
    .default(''),
  employeeId: z.string().optional().default(''),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
})

/** Lista global de contratos del tenant (admin, gerencia, RRHH). */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])
  const tenantId = await getTenantId(event)
  const query = validateWithSchema(listSchema, getQuery(event))

  const filter: Record<string, unknown> = { tenantId }
  if (query.status) filter.status = query.status
  if (query.employeeId) filter.employee = query.employeeId

  const contracts = await Contract.find(filter)
    .sort({ createdAt: -1 })
    .limit(query.limit)
    .populate('employee', 'firstName lastName document')
    .lean()

  return {
    items: contracts.map((contract) => ({
      id: String(contract._id),
      employeeId: String(contract.employee?._id ?? ''),
      employee: contract.employee
        ? `${contract.employee.firstName ?? ''} ${contract.employee.lastName ?? ''}`.trim()
        : 'Empleado',
      document: contract.employee?.document ?? '',
      type: contract.type,
      startDate: contract.startDate,
      endDate: contract.endDate ?? null,
      salary: contract.salary,
      position: contract.position ?? '',
      status: contract.status,
      renewedFrom: contract.renewedFrom ? String(contract.renewedFrom) : null,
    })),
  }
})
