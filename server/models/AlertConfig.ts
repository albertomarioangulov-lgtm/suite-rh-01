import mongoose from 'mongoose'
import type { InferSchemaType } from 'mongoose'
import { getDefaultAlertRules } from '~~/shared/alert-config'

const { Schema, model, models } = mongoose

const AlertRuleSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    description: { type: String, default: '' },
    enabled: { type: Boolean, default: true },
    targetRoles: { type: [String], default: [] },
  },
  { _id: false },
)

const AlertConfigSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    rules: { type: [AlertRuleSchema], default: [] },
    /**
     * Intervalo de actualización de alertas en el cliente (segundos).
     * 0 = solo al entrar/recargar (sin polling); 30/300 = polling ligero.
     */
    pollingIntervalSeconds: { type: Number, default: 0, min: 0, max: 3600 },
  },
  { timestamps: true, versionKey: false },
)

AlertConfigSchema.index({ tenantId: 1 }, { unique: true })

/** Asegura que exista la configuración de alertas con los defaults. */
AlertConfigSchema.statics.getOrCreate = async function (companyId: unknown) {
  let config = await this.findOne({ tenantId: companyId })
  if (!config) {
    config = await this.create({
      tenantId: companyId,
      rules: getDefaultAlertRules(),
    })
  }
  return config
}

export type IAlertConfig = InferSchemaType<typeof AlertConfigSchema>

export const AlertConfig = (models.AlertConfig ||
  model('AlertConfig', AlertConfigSchema)) as mongoose.Model<IAlertConfig> & {
  getOrCreate(companyId: unknown): Promise<mongoose.HydratedDocument<IAlertConfig>>
}
