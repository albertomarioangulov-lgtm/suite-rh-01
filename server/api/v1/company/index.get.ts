import { requireAuth } from '~~/server/utils/authorize'
import { getCompanyConfig } from '~~/server/services/company.service'

/** Configuración de la empresa. Acceso: cualquier usuario autenticado. */
export default defineEventHandler(async (event) => {
  await requireAuth(event)
  return getCompanyConfig()
})
