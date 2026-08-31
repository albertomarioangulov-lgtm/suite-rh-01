import mongoose from 'mongoose'
import type { HydratedDocument, InferSchemaType, Model } from 'mongoose'

const { Schema, model, models } = mongoose

const CompanySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    nit: { type: String, required: true, trim: true },
    /** Logo de la empresa (URL o data URL) para documentos PDF. */
    logo: { type: String, default: '' },
    address: { type: String, required: true, trim: true },
    taxRegime: {
      type: String,
      enum: ['simplified', 'common'],
      default: 'simplified',
    },
    workSchedule: {
      maxWeeklyHours: { type: Number, default: 42, min: 1, max: 168 },
      minDailyHours: { type: Number, default: 6, min: 1, max: 24 },
      maxDailyHours: { type: Number, default: 9, min: 1, max: 24 },
      nightShiftStart: { type: String, default: '19:00' },
      nightShiftEnd: { type: String, default: '06:00' },
    },
    /**
     * Políticas de ausencias y licencias por empresa.
     * `maxDaysPerYear` limita cada tipo de permiso por año calendario
     * (el default se aplica por tipo si no está configurado).
     */
    absencePolicies: {
      maxDaysPerYear: {
        type: Map,
        of: Number,
        default: {},
      },
      /** Días de incapacidad común que paga la empresa (Ley 100: 2). */
      employerPaidIncapacidadDays: { type: Number, default: 2, min: 0 },
      /** Recargo por día de descanso trabajado configurable (0-1). */
      restDaySurchargeOverride: { type: Number, default: null, min: 0, max: 2 },
      /** ¿Exigir soporte documental para aprobar ausencias? */
      requireSupportDocument: { type: Boolean, default: false },
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
)

CompanySchema.index({ nit: 1 }, { unique: true })

/** Devuelve la configuración activa (el sistema asume solo una). */
CompanySchema.statics.getConfig = function () {
  return this.findOne({ active: true })
}

export type ICompany = InferSchemaType<typeof CompanySchema>

export interface ICompanyStatics {
  getConfig(): Promise<HydratedDocument<ICompany> | null>
}

export type CompanyModel = Model<ICompany, Record<string, never>, Record<string, never>> &
  ICompanyStatics

export const Company = (models.Company || model('Company', CompanySchema)) as CompanyModel
