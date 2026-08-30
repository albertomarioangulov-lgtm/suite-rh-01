import mongoose from 'mongoose'
import type { HydratedDocument, InferSchemaType, Model } from 'mongoose'
import {
  ABSENCE_STATUS,
  ABSENCE_TYPES,
  ABSENCE_TYPE_LIST,
  type AbsenceStatus,
  type AbsenceType,
} from '~~/shared/absence'

const { Schema, model, models } = mongoose

const AbsenceSchema = new Schema(
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
    type: {
      type: String,
      enum: ABSENCE_TYPE_LIST,
      required: true,
      index: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    /** Días efectivos (hábiles o calendario según el tipo) calculados al guardar. */
    days: { type: Number, default: 0 },
    /** Días de la ausencia que paga la empresa (incapacidad común: primeros 2). */
    paidByCompanyDays: { type: Number, default: 0 },
    /** Valor reconocido al empleado por la empresa (permisos e incapacidad 1-2). */
    companyPaidValue: { type: Number, default: 0 },
    /** Valor cubierto por la EPS (incapacidad común desde el día 3). */
    epsValue: { type: Number, default: 0 },
    /** Valor cubierto por la ARL (incapacidad laboral, 100% desde el día 1). */
    arlValue: { type: Number, default: 0 },
    /** Descanso compensatorio: fecha programada para el descanso. */
    scheduledRestDate: { type: Date, default: null },
    /** Descanso compensatorio: ¿se pagó el recargo por el día trabajado? */
    surchargePaid: { type: Boolean, default: false },
    supportDocument: { type: String, trim: true },
    observations: { type: String, trim: true },
    status: {
      type: String,
      enum: [ABSENCE_STATUS.PENDING, ABSENCE_STATUS.APPROVED, ABSENCE_STATUS.REJECTED],
      default: ABSENCE_STATUS.PENDING,
      index: true,
    },
    approvedBy: { ref: 'User', type: Schema.Types.ObjectId },
    approvedAt: { type: Date },
    rejectionReason: { type: String, trim: true },
    createdBy: { ref: 'User', type: Schema.Types.ObjectId },
  },
  { timestamps: true, versionKey: false },
)

AbsenceSchema.index({ employee: 1, startDate: 1, endDate: 1 })
AbsenceSchema.index({ tenantId: 1, status: 1 })
AbsenceSchema.index({ type: 1, startDate: -1 })

export type IAbsence = InferSchemaType<typeof AbsenceSchema>

export interface IAbsenceStatics {
  findByEmployeeAndRange(
    employeeId: string,
    start: Date,
    end: Date,
  ): Promise<HydratedDocument<IAbsence>[]>
  findApprovedByEmployeeAndRange(
    employeeId: string,
    start: Date,
    end: Date,
  ): Promise<HydratedDocument<IAbsence>[]>
}

AbsenceSchema.statics.findByEmployeeAndRange = function (
  employeeId: string,
  start: Date,
  end: Date,
) {
  return this.find({
    employee: employeeId,
    startDate: { $lte: end },
    endDate: { $gte: start },
  }).sort({ startDate: 1 })
}

AbsenceSchema.statics.findApprovedByEmployeeAndRange = function (
  employeeId: string,
  start: Date,
  end: Date,
) {
  return this.find({
    employee: employeeId,
    status: ABSENCE_STATUS.APPROVED,
    startDate: { $lte: end },
    endDate: { $gte: start },
  }).sort({ startDate: 1 })
}

export type AbsenceModel = Model<IAbsence, Record<string, never>, Record<string, never>> &
  IAbsenceStatics

export const Absence = (models.Absence ||
  model('Absence', AbsenceSchema)) as AbsenceModel

export type { AbsenceStatus, AbsenceType }
