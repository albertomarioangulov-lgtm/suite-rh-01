import mongoose from 'mongoose'
import type { InferSchemaType } from 'mongoose'

const { Schema, model, models } = mongoose

/** Cargo del catálogo organizacional, con funciones y requisitos. */
const PositionSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    department: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    description: { type: String, trim: true, maxlength: 400, default: '' },
    functions: { type: [String], default: [] },
    requirements: { type: [String], default: [] },
    minSalary: { type: Number, min: 0, default: null },
    maxSalary: { type: Number, min: 0, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
)

PositionSchema.index({ tenantId: 1, title: 1 }, { unique: true })
PositionSchema.index({ department: 1 })

export type IPosition = InferSchemaType<typeof PositionSchema>

export const Position = (models.Position ||
  model('Position', PositionSchema)) as mongoose.Model<IPosition>
