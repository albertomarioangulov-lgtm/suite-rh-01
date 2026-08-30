import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import {
  absenceRejectSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'
import { rejectAbsence } from '~~/server/services/absence.service'

/** Rechaza una ausencia con motivo. Acceso: admin, manager, hr. */
export default defineEventHandler(async (event) => {
  const { userId } = await authorize(event, [
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.HR,
  ])
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const data = validateWithSchema(absenceRejectSchema, body)
  return rejectAbsence(id, data.reason, userId)
})
