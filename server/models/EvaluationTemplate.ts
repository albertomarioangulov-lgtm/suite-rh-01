import mongoose from 'mongoose'
import type { InferSchemaType } from 'mongoose'

const { Schema, model, models } = mongoose

/** Item (pregunta/criterio) de una sección de la plantilla. */
const TemplateItemSchema = new Schema(
  {
    id: { type: String, required: true },
    description: { type: String, required: true, trim: true, maxlength: 300 },
    order: { type: Number, default: 0 },
  },
  { _id: false },
)

/** Sección ponderada de la plantilla (los pesos suman 100). */
const TemplateSectionSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 300, default: '' },
    order: { type: Number, default: 0 },
    weight: { type: Number, required: true, min: 0, max: 100 },
    items: { type: [TemplateItemSchema], default: [] },
  },
  { _id: false },
)

/**
 * Plantilla de evaluación configurable por cargo: secciones con peso e items.
 * Solo una plantilla activa por cargo y tenant.
 */
const EvaluationTemplateSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 300, default: '' },
    positionId: {
      type: Schema.Types.ObjectId,
      ref: 'Position',
      required: true,
      index: true,
    },
    sections: { type: [TemplateSectionSchema], default: [] },
    active: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false },
)

EvaluationTemplateSchema.index(
  { tenantId: 1, positionId: 1, active: 1 },
  { unique: true, partialFilterExpression: { active: true } },
)

export type IEvaluationTemplate = InferSchemaType<
  typeof EvaluationTemplateSchema
>

export const EvaluationTemplate = (models.EvaluationTemplate ||
  model('EvaluationTemplate', EvaluationTemplateSchema)) as mongoose.Model<IEvaluationTemplate>
