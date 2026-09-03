import mongoose from 'mongoose'
import { FEATURE_FLAG_LIST, type FeatureFlag } from '~~/shared/feature-flags'
import type { InferSchemaType } from 'mongoose'

const { Schema, model, models } = mongoose

/**
 * Solicitud de activación de un módulo hecha por un usuario del tenant.
 * La resuelve el superadmin (AMAV): la activación depende del plan/licencia.
 */
const ModuleRequestSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    module: {
      type: String,
      enum: FEATURE_FLAG_LIST,
      required: true,
    },
    message: { type: String, trim: true, maxlength: 500, default: '' },
    status: {
      type: String,
      enum: ['pending', 'handled'],
      default: 'pending',
      index: true,
    },
    requestedBy: { ref: 'User', type: Schema.Types.ObjectId, default: null },
    handledBy: { ref: 'User', type: Schema.Types.ObjectId, default: null },
    handledAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
)

ModuleRequestSchema.index({ tenantId: 1, status: 1, createdAt: -1 })

export type IModuleRequest = InferSchemaType<typeof ModuleRequestSchema>
export type ModuleRequestModule = FeatureFlag

export const ModuleRequest = (models.ModuleRequest ||
  model('ModuleRequest', ModuleRequestSchema)) as mongoose.Model<IModuleRequest>
