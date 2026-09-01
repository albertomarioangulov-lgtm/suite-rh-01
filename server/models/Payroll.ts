import mongoose from 'mongoose'
import type { HydratedDocument, InferSchemaType, Model } from 'mongoose'

const { Schema, model, models } = mongoose

const PayrollEmployeeSchema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    devengados: {
      baseSalary: { type: Number, default: 0 },
      daysWorked: { type: Number, default: 0 },
      /** Días remunerados por ausencias (permisos pagados, vacaciones). */
      paidAbsenceDays: { type: Number, default: 0 },
      /** Valor pagado por la empresa en incapacidad común (días 1-2). */
      absenceCompanyPaidValue: { type: Number, default: 0 },
      /** Valor cubierto por EPS (incapacidad común desde el día 3). */
      absenceEpsValue: { type: Number, default: 0 },
      /** Valor cubierto por ARL (incapacidad laboral). */
      absenceArlValue: { type: Number, default: 0 },
      /** Días de incapacidad común asumidos por la empresa. */
      absenceCompanyPaidDays: { type: Number, default: 0 },
      /** Días de incapacidad común asumidos por la EPS. */
      absenceEpsDays: { type: Number, default: 0 },
      /** Días de incapacidad laboral asumidos por la ARL. */
      absenceArlDays: { type: Number, default: 0 },
      transportAllowance: { type: Number, default: 0 },
      overtimeDay: { type: Number, default: 0 },
      overtimeNight: { type: Number, default: 0 },
      nightSurcharge: { type: Number, default: 0 },
      /** Horas de extra diurna (para el DSNE ante la DIAN). */
      overtimeDayHours: { type: Number, default: 0 },
      /** Horas de extra nocturna (para el DSNE ante la DIAN). */
      overtimeNightHours: { type: Number, default: 0 },
      /** Horas con recargo nocturno (para el DSNE ante la DIAN). */
      nightSurchargeHours: { type: Number, default: 0 },
      bonuses: { type: Number, default: 0 },
      commissions: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    deducciones: {
      employeeHealth: { type: Number, default: 0 },
      employeePension: { type: Number, default: 0 },
      sourceRetention: { type: Number, default: 0 },
      garnishments: { type: Number, default: 0 },
      loans: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    seguridadSocial: {
      employerHealth: { type: Number, default: 0 },
      employerPension: { type: Number, default: 0 },
      arl: { type: Number, default: 0 },
      sena: { type: Number, default: 0 },
      icbf: { type: Number, default: 0 },
      compensationFund: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    /** Desglose de conceptos del catálogo aplicados en el período. */
    conceptos: {
      type: [
        {
          type: { type: String, enum: ['devengo', 'deduccion'], required: true },
          code: { type: String, required: true },
          name: { type: String, required: true },
          dianBlock: { type: String, required: true },
          value: { type: Number, required: true },
          calculation: {
            type: String,
            enum: ['fijo', 'porcentaje'],
            default: 'fijo',
          },
          baseValue: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
    totalToPay: { type: Number, default: 0 },
    observations: { type: String, trim: true },
  },
  { _id: false },
)

const DianTransmissionSchema = new Schema(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    /** Nombre del ZIP enviado (formato del anexo: z + NIT + a + consecutivo). */
    fileName: { type: String, default: '' },
    environment: { type: Number, enum: [1, 2], default: 2 },
    isValid: { type: Boolean, default: false },
    statusCode: { type: String, default: '' },
    statusDescription: { type: String, default: '' },
    statusMessage: { type: String, default: '' },
    errors: { type: [String], default: [] },
    /** CUNE/trackId devuelto por la DIAN (XmlDocumentKey). */
    xmlDocumentKey: { type: String, default: '' },
    transmittedBy: { ref: 'User', type: Schema.Types.ObjectId },
    transmittedAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
)

const PayrollSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    /** Ciclo de pago al que pertenece la nómina. */
    cycle: {
      type: Schema.Types.ObjectId,
      ref: 'PayrollCycle',
      default: null,
      index: true,
    },
    /** Código DIAN PeriodoNomina (tabla 5.5.1) congelado al crear la nómina. */
    periodoNomina: { type: Number, default: 0 },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    status: {
      type: String,
      enum: ['draft', 'approved', 'paid', 'cancelled'],
      default: 'draft',
    },
    employees: { type: [PayrollEmployeeSchema], default: [] },
    totalEarned: { type: Number, default: 0 },
    totalDeducted: { type: Number, default: 0 },
    totalSocialSecurity: { type: Number, default: 0 },
    totalToPay: { type: Number, default: 0 },
    createdBy: { ref: 'User', type: Schema.Types.ObjectId },
    approvedBy: { ref: 'User', type: Schema.Types.ObjectId },
    approvedAt: { type: Date },
    paidAt: { type: Date },
    /** Historial de transmisiones al VPFE de la DIAN (SendNominaSync). */
    dianTransmissions: { type: [DianTransmissionSchema], default: [] },
  },
  { timestamps: true, versionKey: false },
)

// La unicidad de período la valida el servicio por ciclo; aquí solo se
// indexan las consultas (ciclos distintos pueden compartir fechas).
PayrollSchema.index({ tenantId: 1, cycle: 1, periodStart: 1, periodEnd: 1 })
PayrollSchema.index({ tenantId: 1, periodStart: 1, periodEnd: 1 })
PayrollSchema.index({ status: 1 })
PayrollSchema.index({ 'employees.employee': 1 })

const round2 = (value: number) => Math.round(value * 100) / 100

/**
 * Hook: recalcula totales generales desde los empleados y valida que el
 * período no se solape con otra nómina de la empresa.
 */
PayrollSchema.pre('save', async function () {
  const employees = this.employees ?? []
  const totalEarned = round2(
    employees.reduce((acc, entry) => acc + (entry.devengados?.total ?? 0), 0),
  )
  const totalDeducted = round2(
    employees.reduce((acc, entry) => acc + (entry.deducciones?.total ?? 0), 0),
  )
  const totalSocialSecurity = round2(
    employees.reduce((acc, entry) => acc + (entry.seguridadSocial?.total ?? 0), 0),
  )
  const totalToPay = round2(
    employees.reduce((acc, entry) => acc + (entry.totalToPay ?? 0), 0),
  )
  this.totalEarned = totalEarned
  this.totalDeducted = totalDeducted
  this.totalSocialSecurity = totalSocialSecurity
  this.totalToPay = totalToPay

  const PayrollModel = this.constructor as unknown as mongoose.Model<IPayroll>
  const overlap = await PayrollModel.findOne({
    tenantId: this.tenantId,
    status: { $ne: 'cancelled' },
    periodStart: { $lte: this.periodEnd },
    periodEnd: { $gte: this.periodStart },
    _id: { $ne: this._id },
  })
  if (overlap) {
    throw new Error('Ya existe una nómina en ese período')
  }
})

/** Nómina de un período específico. */
PayrollSchema.statics.getByPeriod = function (
  companyId: string,
  periodStart: Date,
  periodEnd: Date,
) {
  return this.findOne({ tenantId: companyId, periodStart, periodEnd })
}

/** Historial de nóminas de un empleado. */
PayrollSchema.statics.getByEmployee = function (employeeId: string) {
  return this.find({ 'employees.employee': employeeId }).sort({
    periodStart: -1,
  })
}

export type IPayrollEmployee = InferSchemaType<typeof PayrollEmployeeSchema>
export type IPayroll = InferSchemaType<typeof PayrollSchema>

export interface IPayrollStatics {
  getByPeriod(
    companyId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<HydratedDocument<IPayroll> | null>
  getByEmployee(employeeId: string): Promise<HydratedDocument<IPayroll>[]>
  calculateTotalPagar(
    devengados: { total: number },
    deducciones: { total: number },
  ): number
}

PayrollSchema.statics.calculateTotalPagar = function (
  devengados: { total: number },
  deducciones: { total: number },
) {
  return round2((devengados?.total ?? 0) - (deducciones?.total ?? 0))
}

export type PayrollModel = Model<
  IPayroll,
  Record<string, never>,
  Record<string, never>
> &
  IPayrollStatics

export const Payroll = (models.Payroll ||
  model('Payroll', PayrollSchema)) as PayrollModel
