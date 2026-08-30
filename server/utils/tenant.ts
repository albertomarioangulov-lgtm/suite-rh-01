import type { H3Event } from 'h3'
import type { UserRole } from '~~/shared/auth'
import type { FeatureFlag } from '~~/shared/feature-flags'
import { Company } from '~~/server/models/Company'
import { Employee } from '~~/server/models/Employee'
import { User } from '~~/server/models/User'
import { authorize } from '~~/server/utils/authorize'
import { isFlagEnabled } from '~~/server/services/feature-flags.service'

/**
 * Sincroniza `tenantIds` del usuario a partir de sus fichas de empleado
 * vinculadas (Employee.user). Se invoca al crear/vincular empleados y al
 * autenticar, para que el usuario siempre tenga su lista de tenants.
 */
export const syncUserTenants = async (userId: string) => {
  const employees = await Employee.find({ user: userId })
    .select('tenantId')
    .lean()
  const tenantIds = Array.from(
    new Set(employees.map((employee) => String(employee.tenantId)).filter(Boolean)),
  )
  const user = await User.findById(userId)
  if (!user) return []
  user.tenantIds = tenantIds as never
  if (!user.tenantActivo && tenantIds.length === 1) {
    user.tenantActivo = tenantIds[0] as never
  }
  if (tenantIds.length === 0) {
    user.tenantActivo = null
  }
  await user.save()
  return tenantIds
}

/** Tenant activo para la petición (contexto de sesión → fallback empresa global). */
export const getTenantId = async (event: H3Event): Promise<string | null> => {
  if (event.context.tenantId) return String(event.context.tenantId)

  // Fallback: empresa activa global (sistemas de una sola empresa).
  const company = await Company.getConfig()
  return company ? String(company._id) : null
}

/** Añade el filtro de tenant a una consulta si hay tenant disponible. */
export const addTenantFilter = async (
  event: H3Event,
  filter: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  const tenantId = await getTenantId(event)
  if (tenantId) filter.tenantId = tenantId
  return filter
}

/** Devuelve el tenant activo del usuario de la sesión (para el frontend). */
export const getUserTenant = async (userId: string) => {
  const user = await User.findById(userId).select('tenantIds tenantActivo').lean()
  const tenantIds = (user?.tenantIds ?? []).map(String)
  if (!user?.tenantActivo && tenantIds.length === 1) {
    return tenantIds[0]
  }
  return user?.tenantActivo ? String(user.tenantActivo) : (tenantIds[0] ?? null)
}

/**
 * Autoriza por rol Y valida que el módulo (feature flag) esté activo para el
 * tenant. Sin tenant activo (usuario sin empresa), se permite el acceso al
 * módulo si existe una empresa global (fallback de un solo tenant).
 */
export const requireFlag = async (
  event: H3Event,
  allowedRoles: UserRole[],
  flag: FeatureFlag,
) => {
  const { userId } = await authorize(event, allowedRoles)
  const tenantId = await getTenantId(event)
  if (tenantId && !(await isFlagEnabled(tenantId, flag))) {
    throw createError({
      statusCode: 403,
      message: 'Este módulo no está habilitado para la empresa.',
    })
  }
  return { userId, tenantId }
}
