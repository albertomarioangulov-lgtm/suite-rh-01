import { requireAuth } from '~~/server/utils/authorize'
import { getCurrentLegalParams } from '~~/server/services/company.service'

/** Parámetros legales vigentes. Acceso: cualquier usuario autenticado. */
export default defineEventHandler(async (event) => {
  await requireAuth(event)
  return getCurrentLegalParams()
})
