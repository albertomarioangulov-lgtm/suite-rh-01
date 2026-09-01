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
      /** Tolerancia de llegada tarde (minutos) antes de marcar tardanza. */
      lateToleranceMinutes: { type: Number, default: 5, min: 0, max: 120 },
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
    /**
     * Cierre mensual de asistencia ('YYYY-MM'): las asistencias de ese mes
     * o anteriores quedan congeladas (no se recalculan con cambios de
     * tolerancia). Independiente de la nómina: aplica también a clientes
     * sin módulo de nómina.
     */
    attendanceClosedThrough: { type: String, default: '', trim: true },
    /** Código de municipio DIAN del domicilio principal (para el CEN). */
    municipalityCode: { type: String, default: '', trim: true },
    /** Frecuencia de pago de nómina (PeriodoNomina en el DSNE). */
    payrollFrequency: {
      type: String,
      enum: ['semanal', 'decenal', 'catorcenal', 'quincenal', 'mensual', 'otro'],
      default: 'mensual',
    },
    /** Ambiente del DSNE: 1 producción, 2 pruebas (habilitación). */
    cenEnvironment: { type: Number, enum: [1, 2], default: 2 },
    /** Identificador del software registrado ante la DIAN (SoftwareID). */
    softwareId: { type: String, trim: true, default: '' },
    /** Código de seguridad del software ante la DIAN (SoftwareSC). */
    softwareSC: { type: String, trim: true, default: '' },
    /** PIN del software asignado al activarlo ante la DIAN (privado, CUNE/SC). */
    softwarePin: { type: String, trim: true, default: '' },
    /** Método de pago del DSNE (tabla 5.3.3.2). Default: 42 = consignación bancaria. */
    paymentMethod: { type: Number, default: 42 },
    /** Numeración correlativa anual del CEN por empleador. */
    cenSequence: { type: Number, default: 0 },
    cenSequenceYear: { type: Number, default: 0 },
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
