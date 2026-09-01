import { ROLES } from '~~/shared/auth'
import { requireFlag } from '~~/server/utils/tenant'
import { FEATURE_FLAGS } from '~~/shared/feature-flags'
import {
  payrollCreateSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'
import { createPayroll } from '~~/server/services/payroll.service'

/** Crea una nómina (borrador) con liquidación automática. */
export default defineEventHandler(async (event) => {
  const { userId } = await requireFlag(event, [
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.HR,
  ], FEATURE_FLAGS.PAYROLL)

  const body = await readBody(event)
  const data = validateWithSchema(payrollCreateSchema, body)

  return createPayroll(
    {
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      cycleId: data.cycleId,
    },
    userId,
  )
})
