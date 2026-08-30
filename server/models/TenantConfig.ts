import mongoose from 'mongoose'
import type { InferSchemaType } from 'mongoose'
import { getDefaultFlags } from '~~/shared/feature-flags'

const { Schema, model, models } = mongoose

/**
 * Configuración por tenant: qué módulos (feature flags) están habilitados.
 * Es la fuente local de licenciamiento; el proveedor externo (Zentitle/Reprise)
 * puede reemplazarla sin cambiar el contrato.
 */
const TenantConfigSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
      unique: true,
    },
    enabledFlags: { type: [String], default: getDefaultFlags },
  },
  { timestamps: true, versionKey: false },
)

/** Asegura que exista la configuración con los flags por defecto. */
TenantConfigSchema.statics.getOrCreate = async function (tenantId: unknown) {
  let config = await this.findOne({ tenantId })
  if (!config) {
    config = await this.create({ tenantId, enabledFlags: getDefaultFlags() })
  }
  return config
}

export type ITenantConfig = InferSchemaType<typeof TenantConfigSchema>

export const TenantConfig = (models.TenantConfig ||
  model('TenantConfig', TenantConfigSchema)) as mongoose.Model<ITenantConfig> & {
  getOrCreate(tenantId: unknown): Promise<mongoose.HydratedDocument<ITenantConfig>>
}
