import mongoose from 'mongoose'
import type { InferSchemaType } from 'mongoose'

const { Schema, model, models } = mongoose

const PayrollConceptSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    /** devengo o deduccion. */
    type: { type: String, enum: ['devengo', 'deduccion'], required: true },
    /** Código interno corto y único por empresa (p. ej. BONO_NAV). */
    code: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    /** Bloque del XSD DIAN donde se emite el concepto. */
    dianBlock: { type: String, required: true },
    /** fijo: valor por período · porcentaje: % del salario base. */
    calculation: {
      type: String,
      enum: ['fijo', 'porcentaje'],
      default: 'fijo',
    },
    value: { type: Number, required: true, min: 0 },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false },
)

PayrollConceptSchema.index({ tenantId: 1, code: 1 }, { unique: true })
PayrollConceptSchema.index({ tenantId: 1, type: 1, active: 1 })

export type IPayrollConcept = InferSchemaType<typeof PayrollConceptSchema>

export const PayrollConcept = (models.PayrollConcept ||
  model('PayrollConcept', PayrollConceptSchema)) as mongoose.Model<IPayrollConcept>
