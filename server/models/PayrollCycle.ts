import mongoose from 'mongoose'
import type { InferSchemaType } from 'mongoose'

const { Schema, model, models } = mongoose

const PayrollCycleSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    /** Frecuencia del ciclo (tabla 5.5.1 DIAN). */
    frequency: {
      type: String,
      enum: ['semanal', 'decenal', 'catorcenal', 'quincenal', 'mensual', 'otro'],
      required: true,
    },
    description: { type: String, trim: true, default: '' },
    /** Ciclo por defecto de la empresa (empleados sin ciclo asignado). */
    isDefault: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false },
)

PayrollCycleSchema.index({ tenantId: 1, isDefault: 1 })
PayrollCycleSchema.index({ tenantId: 1, name: 1 }, { unique: true })

export type IPayrollCycle = InferSchemaType<typeof PayrollCycleSchema>

export const PayrollCycle = (models.PayrollCycle ||
  model('PayrollCycle', PayrollCycleSchema)) as mongoose.Model<IPayrollCycle>
