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
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    hireDate: { type: Date },
    contractType: {
      type: String,
      enum: ['indefinite', 'fixed', 'work_labor', 'intern'],
      default: 'indefinite',
    },
    /** Alias legible de contractType (español). Se sincroniza con contractType. */
    tipoContrato: { type: String, trim: true },
    /** Día de descanso semanal (0=domingo … 6=sábado). Default: domingo. */
    diaDescanso: { type: Number, default: 0, min: 0, max: 6 },
    baseSalary: { type: Number, required: true, min: 0 },
    /** Clase de riesgo ARL (1-5) usada en el cálculo de seguridad social. */
    arlRiskClass: { type: Number, default: 1, min: 1, max: 5 },
    position: { type: String, required: true, trim: true },
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
  { unique: true, sparse: true },
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
