import mongoose from 'mongoose'
import type { InferSchemaType } from 'mongoose'

const { Schema, model, models } = mongoose

/** Respuesta a un item de la plantilla (escala 1-5). */
const ScoreItemSchema = new Schema(
  {
    itemId: { type: String, required: true },
    description: { type: String, default: '' },
    score: { type: Number, min: 1, max: 5, default: null },
  },
  { _id: false },
)

/** Snapshot de la sección evaluada con sus puntajes. */
const ScoreSectionSchema = new Schema(
  {
    sectionId: { type: String, required: true },
    sectionTitle: { type: String, default: '' },
    sectionWeight: { type: Number, default: 0 },
    items: { type: [ScoreItemSchema], default: [] },
  },
  { _id: false },
)

/**
 * Evaluación de desempeño de un empleado, basada en una plantilla
 * configurable por cargo. El puntaje total (0-100) se calcula con los
 * pesos de las secciones.
 */
const EvaluationSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    evaluator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    periodLabel: { type: String, required: true, trim: true, maxlength: 80 },
    periodStart: { type: Date, default: null },
    periodEnd: { type: Date, default: null },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'EvaluationTemplate',
      default: null,
    },
    positionId: { type: Schema.Types.ObjectId, ref: 'Position', default: null },
    status: {
      type: String,
      enum: ['draft', 'completed', 'approved'],
      default: 'draft',
      index: true,
    },
    sections: { type: [ScoreSectionSchema], default: [] },
    recommendations: { type: String, trim: true, maxlength: 2000, default: '' },
    actionPlan: { type: String, trim: true, maxlength: 2000, default: '' },
    /** Puntaje total 0-100 calculado con los pesos de las secciones. */
    overallScore: { type: Number, min: 0, max: 100, default: 0 },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
)

EvaluationSchema.index({ tenantId: 1, employee: 1, createdAt: -1 })
EvaluationSchema.index({ tenantId: 1, status: 1 })

export type IEvaluation = InferSchemaType<typeof EvaluationSchema>

export const Evaluation = (models.Evaluation ||
  model('Evaluation', EvaluationSchema)) as mongoose.Model<IEvaluation>
