import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import type { HydratedDocument, InferSchemaType, Model } from 'mongoose'

// Mongoose es CommonJS: se importa por defecto y se desestructura para
// evitar el error "Named export 'models' not found" en Node ESM (dev).
const { Schema, model, models } = mongoose

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: {
      type: String,
      enum: ['superadmin', 'admin', 'manager', 'hr', 'employee'],
      default: 'employee',
    },
    active: { type: Boolean, default: true },
    inviteTokenHash: { type: String },
    inviteTokenExpiresAt: { type: Date },
    emailStatus: {
      type: String,
      enum: [
        'none',
        'pending',
        'delivered',
        'opened',
        'clicked',
        'bounced',
        'blocked',
        'invalid',
        'failed',
      ],
      default: 'none',
    },
    emailStatusUpdatedAt: { type: Date },
    /**
     * Multi-tenant: empresas (tenants) a las que pertenece el usuario.
     * Se sincroniza con las fichas de empleado vinculadas (Employee.user).
     */
    tenantIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Company' }],
      default: [],
    },
    /** Tenant activo en la sesión actual (cuando el usuario tiene varios). */
    tenantActivo: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
  },
  { timestamps: true, versionKey: false },
)

UserSchema.index({ tenantIds: 1 })
UserSchema.index({ tenantActivo: 1 })

// Hash de la contraseña antes de guardar (solo si fue modificada).
// Nota: Mongoose 9 eliminó el estilo de middleware con callback `next()`;
// los hooks deben ser async y devolver la promesa directamente.
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 10)
})

UserSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email })
}

UserSchema.methods.comparePassword = async function (password: string) {
  return bcrypt.compare(password, this.password)
}

// Elimina campos sensibles al serializar (JSON responses).
UserSchema.methods.toJSON = function () {
  const obj = this.toObject()
  delete obj.password
  return obj
}

export type IUser = InferSchemaType<typeof UserSchema>

export interface IUserMethods {
  comparePassword(password: string): Promise<boolean>
}

export interface IUserStatics {
  findByEmail(email: string): Promise<HydratedDocument<IUser, IUserMethods> | null>
}

export type UserModel = Model<IUser, Record<string, never>, IUserMethods> & IUserStatics

// `models.User` ya existe en caliente (HMR) y su tipo es genérico; el cast
// tipa el modelo con los métodos/statics que declaramos en el schema.
export const User = (models.User || model('User', UserSchema)) as UserModel
