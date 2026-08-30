import mongoose from 'mongoose'
import type { HydratedDocument, InferSchemaType, Model } from 'mongoose'

const { Schema, model, models } = mongoose

const LegalParamsSchema = new Schema(
  {
    uvtValue: { type: Number, required: true, min: 0 },
    /** Salario mínimo mensual legal vigente (SMMLV). */
    minimumWage: { type: Number, required: true, min: 0 },
    /** Auxilio de transporte mensual vigente. */
    transportAllowance: { type: Number, required: true, min: 0 },
    withholdingRates: {
      type: [
        {
          from: { type: Number, required: true },
          to: { type: Number, required: true },
          percentage: { type: Number, required: true },
        },
      ],
      default: [],
    },
    healthPercentages: {
      employee: { type: Number, required: true, min: 0, max: 100 },
      employer: { type: Number, required: true, min: 0, max: 100 },
    },
    pensionPercentages: {
      employee: { type: Number, required: true, min: 0, max: 100 },
      employer: { type: Number, required: true, min: 0, max: 100 },
    },
    nightSurchargePercentage: { type: Number, default: 0.35, min: 0, max: 1 },
    overtimeDayPercentage: { type: Number, default: 0.25, min: 0, max: 1 },
    overtimeNightPercentage: { type: Number, default: 0.75, min: 0, max: 1 },
    arlRiskClass: { type: Number, default: 1, min: 1, max: 5 },
    /**
     * Tarifas ARL por clase de riesgo (1-5), configurables por período.
     * Defaults vigentes: 0,522% / 1,044% / 2,436% / 4,35% / 6,96%.
     */
    arlRates: {
      type: Map,
      of: Number,
      default: {
        '1': 0.00522,
        '2': 0.01044,
        '3': 0.02436,
        '4': 0.0435,
        '5': 0.0696,
      },
    },
    /** Parafiscales: SENA, ICBF y caja de compensación (proporción, 0-1). */
    parafiscales: {
      sena: { type: Number, default: 0.02, min: 0, max: 1 },
      icbf: { type: Number, default: 0.03, min: 0, max: 1 },
      compensationFund: { type: Number, default: 0.04, min: 0, max: 1 },
    },
    /** % del salario diario en incapacidad común (2/3 = 0,6667). */
    incapacidadComunDailyPercent: { type: Number, default: 2 / 3, min: 0, max: 1 },
    /** Días de incapacidad común que paga la empresa (Ley 100: 2). */
    employerPaidIncapacidadDays: { type: Number, default: 2, min: 0 },
    /** Horas base del mes para el valor hora (salario ÷ 240 por defecto). */
    baseHoursPerMonth: { type: Number, default: 240, min: 1 },
    validFrom: { type: Date, required: true },
    validTo: { type: Date, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
)

LegalParamsSchema.index({ active: 1, validFrom: -1 })

/** Parámetros vigentes (solo un período activo a la vez). */
LegalParamsSchema.statics.getCurrent = function () {
  return this.findOne({ active: true })
}

/** Historial de períodos ordenado por fecha de vigencia (más reciente primero). */
LegalParamsSchema.statics.getHistorical = function () {
  return this.find({}).sort({ validFrom: -1 })
}

export type ILegalParams = InferSchemaType<typeof LegalParamsSchema>

export interface ILegalParamsStatics {
  getCurrent(): Promise<HydratedDocument<ILegalParams> | null>
  getHistorical(): Promise<HydratedDocument<ILegalParams>[]>
}

export type LegalParamsModel = Model<ILegalParams, Record<string, never>, Record<string, never>> &
  ILegalParamsStatics

export const LegalParams = (models.LegalParams ||
  model('LegalParams', LegalParamsSchema)) as LegalParamsModel
