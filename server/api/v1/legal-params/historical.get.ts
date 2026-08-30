import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getHistoricalLegalParams } from '~~/server/services/company.service'

/** Historial de períodos de parámetros legales. Acceso: admin y manager. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER])
  return getHistoricalLegalParams()
})
