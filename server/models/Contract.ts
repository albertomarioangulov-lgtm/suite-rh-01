import mongoose from 'mongoose'
import type { InferSchemaType } from 'mongoose'

const { Schema, model, models } = mongoose

/**
 * Contrato laboral (documento legal). Pertenece a un período de vinculación
 * (EmploymentPeriod) y guarda las condiciones: tipo, vigencia, salario, cargo.
 */
const ContractSchema = new Schema(
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
    employmentPeriod: {
      type: Schema.Types.ObjectId,
      ref: 'EmploymentPeriod',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['indefinite', 'fixed', 'work_labor', 'intern'],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    salary: { type: Number, required: true, min: 0 },
    position: { type: String, trim: true },
    status: {
      type: String,
      enum: ['active', 'expired', 'terminated', 'renewed'],
      default: 'active',
      index: true,
    },
    documentUrl: { type: String, trim: true },
    renewedFrom: { type: Schema.Types.ObjectId, ref: 'Contract', default: null },
    createdBy: { ref: 'User', type: Schema.Types.ObjectId },
  },
  { timestamps: true, versionKey: false },
)

ContractSchema.index({ employee: 1, status: 1 })
ContractSchema.index({ tenantId: 1, status: 1, endDate: 1 })

export type IContract = InferSchemaType<typeof ContractSchema>

export const Contract = (models.Contract ||
  model('Contract', ContractSchema)) as mongoose.Model<IContract>
