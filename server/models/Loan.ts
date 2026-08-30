import mongoose from 'mongoose'
import type { InferSchemaType } from 'mongoose'

const { Schema, model, models } = mongoose

const LoanPaymentSchema = new Schema(
  {
    periodStart: { type: Date },
    periodEnd: { type: Date },
    amount: { type: Number, required: true, min: 0 },
    /** 'installment' = cuota de nómina · 'manual' = abono directo. */
    type: { type: String, enum: ['installment', 'manual'], default: 'installment' },
    paidAt: { type: Date, default: () => new Date() },
    recordedBy: { ref: 'User', type: Schema.Types.ObjectId },
  },
  { _id: false },
)

const LoanSchema = new Schema(
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
    description: { type: String, trim: true },
    principal: { type: Number, required: true, min: 0 },
    interestRate: { type: Number, default: 0, min: 0, max: 1 },
    totalWithInterest: { type: Number, default: 0, min: 0 },
    termMonths: { type: Number, required: true, min: 1 },
    installment: { type: Number, required: true, min: 0 },
    balance: { type: Number, required: true, min: 0 },
    startDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['active', 'paid', 'cancelled'],
      default: 'active',
    },
    payments: { type: [LoanPaymentSchema], default: [] },
    createdBy: { ref: 'User', type: Schema.Types.ObjectId },
  },
  { timestamps: true, versionKey: false },
)

LoanSchema.index({ employee: 1, status: 1 })
LoanSchema.index({ tenantId: 1, status: 1 })

export type ILoan = InferSchemaType<typeof LoanSchema>
export type ILoanPayment = InferSchemaType<typeof LoanPaymentSchema>

export const Loan = (models.Loan || model('Loan', LoanSchema)) as mongoose.Model<ILoan>
