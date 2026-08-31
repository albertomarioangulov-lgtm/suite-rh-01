import mongoose from 'mongoose'
import type { InferSchemaType } from 'mongoose'

const { Schema, model, models } = mongoose

/**
 * Período de vinculación de un empleado: cada ingreso/salida/reingreso
 * genera un registro. Es la fuente del historial laboral y de la rotación.
 */
const EmploymentPeriodSchema = new Schema(
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
    hireDate: { type: Date, required: true },
    terminationDate: { type: Date, default: null },
    terminationReason: {
      type: String,
      enum: [
        'retiro_voluntario',
        'despido',
        'contrato_vencido',
        'pension',
        'otro',
      ],
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'terminated'],
      default: 'active',
      index: true,
    },
    /** Contrato asociado al período (opcional). */
    contract: { type: Schema.Types.ObjectId, ref: 'Contract', default: null },
    createdBy: { ref: 'User', type: Schema.Types.ObjectId },
  },
  { timestamps: true, versionKey: false },
)

EmploymentPeriodSchema.index({ employee: 1, status: 1 })
EmploymentPeriodSchema.index({ tenantId: 1, status: 1, hireDate: -1 })

export type IEmploymentPeriod = InferSchemaType<typeof EmploymentPeriodSchema>

export const EmploymentPeriod = (models.EmploymentPeriod ||
  model('EmploymentPeriod', EmploymentPeriodSchema)) as mongoose.Model<IEmploymentPeriod>
