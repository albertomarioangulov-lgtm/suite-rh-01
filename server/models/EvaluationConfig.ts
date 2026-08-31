import mongoose from 'mongoose'
import type { InferSchemaType } from 'mongoose'

const { Schema, model, models } = mongoose

/**
 * Configuración de evaluaciones por tenant: quién evalúa, a quién, alcance
 * por áreas y ciclo. Cada cambio queda versionado en EvaluationConfigHistory.
 */
const EvaluationConfigSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      unique: true,
      index: true,
    },
    enabled: { type: Boolean, default: true },
    frequency: {
      type: String,
      enum: ['monthly', 'quarterly', 'semiannual', 'annual', 'custom'],
      default: 'semiannual',
    },
    cycleStart: { type: Date, default: null },
    cycleEnd: { type: Date, default: null },
    cycleDue: { type: Date, default: null },
    /** Alcance: todas las áreas o áreas específicas. */
    scope: { type: String, enum: ['all', 'areas'], default: 'all' },
    areaIds: { type: [Schema.Types.ObjectId], ref: 'Department', default: [] },
    /** Regla de evaluador: jefe directo del empleado o asignación manual. */
    evaluatorRule: { type: String, enum: ['manager', 'manual'], default: 'manager' },
    allowSelfEvaluation: { type: Boolean, default: false },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false },
)

export type IEvaluationConfig = InferSchemaType<typeof EvaluationConfigSchema>

export const EvaluationConfig = (models.EvaluationConfig ||
  model('EvaluationConfig', EvaluationConfigSchema)) as mongoose.Model<IEvaluationConfig>
