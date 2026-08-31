import mongoose from 'mongoose'
import type { InferSchemaType } from 'mongoose'

const { Schema, model, models } = mongoose

/**
 * Campaña de evaluación de desempeño: un ciclo con su propio alcance
 * (todas las áreas o áreas específicas), regla de evaluador y fechas.
 * Desde la campaña se generan las evaluaciones en lote.
 */
const EvaluationCampaignSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 400, default: '' },
    status: {
      type: String,
      enum: ['draft', 'active', 'closed'],
      default: 'draft',
      index: true,
    },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    dueDate: { type: Date, default: null },
    scope: { type: String, enum: ['all', 'areas'], default: 'all' },
    areaIds: { type: [Schema.Types.ObjectId], ref: 'Department', default: [] },
    evaluatorRule: {
      type: String,
      enum: ['manager', 'manual'],
      default: 'manager',
    },
    allowSelfEvaluation: { type: Boolean, default: false },
    /** Total de evaluaciones generadas desde la campaña. */
    generatedCount: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false },
)

EvaluationCampaignSchema.index({ tenantId: 1, status: 1, createdAt: -1 })

export type IEvaluationCampaign = InferSchemaType<
  typeof EvaluationCampaignSchema
>

export const EvaluationCampaign = (models.EvaluationCampaign ||
  model('EvaluationCampaign', EvaluationCampaignSchema)) as mongoose.Model<IEvaluationCampaign>
