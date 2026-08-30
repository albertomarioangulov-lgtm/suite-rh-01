import { TenantConfig } from '~~/server/models/TenantConfig'
import {
  FEATURE_FLAG_LIST,
  UNBUILT_MODULES,
  type FeatureFlag,
} from '~~/shared/feature-flags'

/**
 * Proveedor de licencias. Hoy resuelve desde la configuración local del
 * tenant; mañana se conecta a Zentitle/Reprise con el mismo contrato:
 * `isFlagEnabled(tenantId, flag) → boolean`.
 */
export const isFlagEnabled = async (
  tenantId: string,
  flag: FeatureFlag,
): Promise<boolean> => {
  // Los módulos no construidos aún no se pueden activar.
  if (UNBUILT_MODULES.includes(flag)) return false

  const config = await TenantConfig.getOrCreate(tenantId)
  return (config.enabledFlags ?? []).includes(flag)
}

/** Flags activos del tenant (para el frontend). */
export const getEnabledFlags = async (tenantId: string): Promise<FeatureFlag[]> => {
  const config = await TenantConfig.getOrCreate(tenantId)
  return (config.enabledFlags ?? []).filter(
    (flag: string) =>
      FEATURE_FLAG_LIST.includes(flag as FeatureFlag) &&
      !UNBUILT_MODULES.includes(flag as FeatureFlag),
  ) as FeatureFlag[]
}

/** Habilita/deshabilita un flag del tenant (admin). */
export const setFlagEnabled = async (
  tenantId: string,
  flag: FeatureFlag,
  enabled: boolean,
) => {
  if (UNBUILT_MODULES.includes(flag)) {
    throw createError({
      statusCode: 400,
      message: 'Ese módulo aún no está disponible.',
    })
  }
  const config = await TenantConfig.getOrCreate(tenantId)
  const flags = new Set(config.enabledFlags ?? [])
  if (enabled) {
    flags.add(flag)
  } else {
    flags.delete(flag)
  }
  config.enabledFlags = Array.from(flags) as never
  await config.save()
  return config.toJSON()
}
