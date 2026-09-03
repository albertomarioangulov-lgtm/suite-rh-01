import mongoose from 'mongoose'
import type { HydratedDocument, InferSchemaType, Model } from 'mongoose'
import { ROLES } from '~~/shared/auth'
import { User } from '~~/server/models/User'

const { Schema, model, models } = mongoose

const EmployeeSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    document: { type: String, required: true, trim: true },
    /** Código DIAN del tipo de documento (tabla 5.2.1 anexo técnico). Default: 13 = CC. */
    documentType: {
      type: Number,
      enum: [11, 12, 13, 21, 22, 31, 41, 42, 47, 50, 91],
      default: 13,
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    hireDate: { type: Date },
    contractType: {
      type: String,
      enum: ['indefinite', 'fixed', 'work_labor', 'intern'],
      default: 'indefinite',
    },
    /** Código DIAN TipoTrabajador (tabla 5.5.3). Default: 01 = dependiente. */
    employeeType: {
      type: String,
      enum: [
        '01', '02', '04', '12', '18', '19', '21', '22', '23', '30',
        '31', '47', '51', '54', '56', '58',
      ],
      default: '01',
    },
    /** Código DIAN SubTipoTrabajador (tabla 5.5.4). Default: 00 = no aplica. */
    subEmployeeType: {
      type: String,
      enum: ['00', '01'],
      default: '00',
    },
    /** Contrato con salario integral (SalarioIntegral en el DSNE). */
    salarioIntegral: { type: Boolean, default: false },
    /** Entidad bancaria para el pago de nómina. */
    bankName: { type: String, trim: true, default: '' },
    /** Tipo de cuenta bancaria: ahorros o corriente. */
    accountType: {
      type: String,
      enum: ['ahorros', 'corriente'],
      default: null,
    },
    /** Número de cuenta bancaria para el pago de nómina. */
    accountNumber: { type: String, trim: true, default: '' },
    /** Ciclo de pago de nómina; vacío = ciclo por defecto de la empresa. */
    payrollCycle: {
      type: Schema.Types.ObjectId,
      ref: 'PayrollCycle',
      default: null,
      index: true,
    },
    /** Alias legible de contractType (español). Se sincroniza con contractType. */
    tipoContrato: { type: String, trim: true },
    /** Día de descanso semanal (0=domingo … 6=sábado). Default: domingo. */
    diaDescanso: { type: Number, default: 0, min: 0, max: 6 },
    /**
     * Salario base. Opcional mientras el módulo de Nómina no esté activo;
     * la creación de nómina valida que los empleados lo tengan configurado.
     */
    baseSalary: { type: Number, default: 0, min: 0 },
    /** Clase de riesgo ARL (1-5) usada en el cálculo de seguridad social. */
    arlRiskClass: { type: Number, default: 1, min: 1, max: 5 },
    position: { type: String, required: true, trim: true },
    /** Área o departamento de la organización (catálogo). */
    department: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    /** Sede (ubicación física) donde trabaja el empleado (ADR-002). */
    sedeId: { type: Schema.Types.ObjectId, ref: 'Site', default: null, index: true },
    /** Jefe directo del empleado (reporta a). */
    manager: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    assignedShift: { type: Schema.Types.ObjectId, ref: 'Shift', default: null },
    active: { type: Boolean, default: true },
    /** Fecha de retiro/baja del empleado (para cálculo de rotación). */
    terminationDate: { type: Date, default: null },
    /** Motivo de la baja: retiro_voluntario, despido, contrato_vencido, pension, otro. */
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
    createdBy: { ref: 'User', type: Schema.Types.ObjectId },
  },
  { timestamps: true, versionKey: false },
)

// Índices: documento y email únicos POR EMPRESA; activo por empresa.
EmployeeSchema.index({ tenantId: 1, document: 1 }, { unique: true })
EmployeeSchema.index(
  { tenantId: 1, email: 1 },
  {
    unique: true,
    // Solo indexa emails reales (string): null/ausente nunca colisionan.
    partialFilterExpression: { email: { $type: 'string' } },
  },
)
EmployeeSchema.index({ tenantId: 1, active: 1 })

/**
 * Hook: valida que el usuario asociado tenga rol 'employee'.
 * La ruta ya valida con mensaje amigable; este hook es la red de seguridad.
 * OJO (tipos): `this.user` puede tiparse como ObjectId; si el typecheck
 * falla, castear con `this.user as mongoose.Types.ObjectId`.
 */
EmployeeSchema.pre('save', async function () {
  if (!this.user || !this.isModified('user')) return
  const linkedUser = await User.findById(this.user)
  if (!linkedUser || linkedUser.role !== ROLES.EMPLOYEE) {
    throw new Error('El usuario asociado debe tener rol empleado')
  }
})

/** Busca un empleado por empresa y documento. */
EmployeeSchema.statics.findByDocument = function (
  tenantId: mongoose.Types.ObjectId,
  document: string,
) {
  return this.findOne({ tenantId, document })
}

export type IEmployee = InferSchemaType<typeof EmployeeSchema>

export interface IEmployeeStatics {
  findByDocument(
    tenantId: mongoose.Types.ObjectId,
    document: string,
  ): Promise<HydratedDocument<IEmployee> | null>
}

export type EmployeeModel = Model<
  IEmployee,
  Record<string, never>,
  Record<string, never>
> &
  IEmployeeStatics

export const Employee = (models.Employee ||
  model('Employee', EmployeeSchema)) as EmployeeModel
