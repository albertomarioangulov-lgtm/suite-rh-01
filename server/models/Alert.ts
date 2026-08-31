import mongoose from 'mongoose'
import type { InferSchemaType } from 'mongoose'

const { Schema, model, models } = mongoose

/**
 * Alertas del sistema (preparado para el Módulo 6). Por ahora se generan
 * cuando se superan los límites legales de horas extras.
 */
const AlertSchema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'Employee' },
    /** Destino personal: si se define, solo este usuario ve la alerta. */
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    /**
     * Clave estable de deduplicación (ej. `evaluation_pending:{userId}:{campaignId}`).
     * Permite consolidar avisos del mismo tipo hacia el mismo usuario.
     */
    dedupeKey: { type: String, default: '' },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Company' },
    module: {
      type: String,
      enum: ['attendance', 'shift', 'payroll', 'absence', 'evaluation'],
      default: 'attendance',
    },
    type: {
      type: String,
      enum: ['overtime_limit', 'info', 'warning'],
      default: 'info',
    },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    /**
     * Clave de configuración de la alerta (ej. 'absence_pending') para saber
     * qué reglas de enrutamiento y habilitación aplican.
     */
    alertKey: { type: String, default: 'general' },
    /** Roles destino: solo estos roles pueden ver la alerta. */
    targetRoles: { type: [String], default: [] },
    /** Cantidad de ítems representados (ej. evaluaciones pendientes). */
    count: { type: Number, default: 1, min: 1 },
  },
  { timestamps: true, versionKey: false },
)

AlertSchema.index({ employee: 1, read: 1 })
AlertSchema.index({ user: 1, dedupeKey: 1, read: 1 })

export type IAlert = InferSchemaType<typeof AlertSchema>

export const Alert = (models.Alert || model('Alert', AlertSchema)) as mongoose.Model<IAlert>
