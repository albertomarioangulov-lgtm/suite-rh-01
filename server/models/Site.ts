import mongoose from 'mongoose'
import type { InferSchemaType } from 'mongoose'

const { Schema, model, models } = mongoose

/**
 * Sede (ubicación física) de la empresa bajo el mismo NIT.
 * ADR-002: Company → Sede → Department → Position → Employee.
 */
const SiteSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    code: { type: String, trim: true, maxlength: 20, default: '' },
    city: { type: String, trim: true, maxlength: 80, default: '' },
    /** Código DIVIPOLA (5 dígitos) usado para el DSNE (LugarTrabajo). */
    municipalityCode: { type: String, trim: true, maxlength: 10, default: '' },
    address: { type: String, trim: true, maxlength: 200, default: '' },
    phone: { type: String, trim: true, maxlength: 30, default: '' },
    /** Sede principal de la empresa (una sola por tenant). */
    isMain: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false },
)

SiteSchema.index({ tenantId: 1, name: 1 }, { unique: true })
// Una sola sede principal por tenant (índice parcial sobre isMain: true).
SiteSchema.index(
  { tenantId: 1, isMain: 1 },
  { unique: true, partialFilterExpression: { isMain: true } },
)

export type ISite = InferSchemaType<typeof SiteSchema>

export const Site = (models.Site ||
  model('Site', SiteSchema)) as mongoose.Model<ISite>
