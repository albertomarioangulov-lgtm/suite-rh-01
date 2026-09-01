import { PayrollCycle } from '~~/server/models/PayrollCycle'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import {
  mongoIdSchema,
  payrollCycleMoveSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'
import {
  ensureDefaultCycle,
  moveEmployeeToCycle,
} from '~~/server/services/payroll-cycle.service'

/** Mueve un empleado del ciclo (origen = URL) a otro ciclo o al por defecto. */
export default defineEventHandler(async (event) => {
  const { userId } = await authorize(event, [
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.HR,
  ])

  const tenantId = await getTenantId(event)
  const id = validateWithSchema(
    mongoIdSchema,
    getRouterParam(event, 'id') || '',
  )
  const source = await PayrollCycle.findOne({ _id: id, tenantId })
  if (!source) {
    throw createError({ statusCode: 404, message: 'Ciclo no encontrado' })
  }

  const body = await readBody(event)
  const data = validateWithSchema(payrollCycleMoveSchema, body)

  let toCycleId: string | null
  let toCycleName: string
  if (data.toCycleId) {
    if (String(data.toCycleId) === String(id)) {
      throw createError({
        statusCode: 400,
        message: 'El empleado ya está en ese ciclo.',
      })
    }
    const target = await PayrollCycle.findOne({
      _id: data.toCycleId,
      tenantId,
    })
    if (!target) {
      throw createError({
        statusCode: 404,
        message: 'Ciclo destino no encontrado.',
      })
    }
    toCycleId = String(target._id)
    toCycleName = target.name
  } else {
    if (source.isDefault) {
      throw createError({
        statusCode: 400,
        message: 'El empleado ya está en el ciclo por defecto.',
      })
    }
    const defaultCycle = await ensureDefaultCycle(String(tenantId))
    toCycleId = null
    toCycleName = defaultCycle.name
  }

  const session = await getUserSession(event)
  const userName = (session.user as { name?: string } | undefined)?.name

  const employee = await moveEmployeeToCycle({
    tenantId: String(tenantId),
    employeeId: data.employeeId,
    fromCycleId: String(id),
    fromCycleName: source.name,
    fromCycleIsDefault: source.isDefault,
    toCycleId,
    toCycleName,
    userId,
    userName,
  })

  return { employee, toCycle: { _id: toCycleId, name: toCycleName } }
})
