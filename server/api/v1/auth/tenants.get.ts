import { Company } from '~~/server/models/Company'
import { User } from '~~/server/models/User'
import { requireAuth } from '~~/server/utils/authorize'
import { syncUserTenants } from '~~/server/utils/tenant'

/**
 * Empresas (tenants) a las que pertenece el usuario, con su tenant activo.
 * Acceso: cualquier usuario autenticado.
 */
export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event)
  await syncUserTenants(userId)

  const user = await User.findById(userId).select('tenantIds tenantActivo').lean()
  const tenantIds = (user?.tenantIds ?? []).map(String)
  const companies = await Company.find({ _id: { $in: tenantIds } })
    .select('name nit')
    .lean()

  return {
    items: companies.map((company) => ({
      _id: String(company._id),
      name: company.name,
      nit: company.nit,
    })),
    activeTenantId: user?.tenantActivo ? String(user.tenantActivo) : (tenantIds[0] ?? null),
  }
})
