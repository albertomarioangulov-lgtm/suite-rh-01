import mongoose from 'mongoose'
import type { InferSchemaType } from 'mongoose'

const { Schema, model, models } = mongoose

/**
 * Historial inmutable de la configuración de evaluaciones.
 * Guarda el snapshot completo antes/después de cada cambio.
 */
const EvaluationConfigHistorySchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    configSnapshot: { type: Schema.Types.Mixed, default: {} },
    changes: { type: Schema.Types.Mixed, default: {} },
    comment: { type: String, trim: true, maxlength: 300, default: '' },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    userName: { type: String, default: '' },
  },
  { timestamps: true, versionKey: false },
)

EvaluationConfigHistorySchema.index({ tenantId: 1, createdAt: -1 })

export type IEvaluationConfigHistory = InferSchemaType<
  typeof EvaluationConfigHistorySchema
>

export const EvaluationConfigHistory = (models.EvaluationConfigHistory ||
  model('EvaluationConfigHistory', EvaluationConfigHistorySchema)) as mongoose.Model<IEvaluationConfigHistory>
