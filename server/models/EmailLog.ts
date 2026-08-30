import mongoose from 'mongoose'
import type { InferSchemaType } from 'mongoose'

const { Schema, model, models } = mongoose

export const EMAIL_STATUSES = [
  'pending',
  'delivered',
  'opened',
  'clicked',
  'bounced',
  'blocked',
  'invalid',
  'failed',
] as const

const EmailEventSchema = new Schema(
  {
    /** Estado normalizado; 'unknown' cuando Brevo envía un evento no mapeado. */
    status: { type: String, required: true },
    /** Nombre crudo del evento de Brevo (ej. uniqueOpened, hardBounce). */
    eventName: { type: String },
    messageId: { type: String },
    eventAt: { type: Date, required: true },
    /** Payload crudo del evento para diagnóstico y trazabilidad. */
    raw: { type: Schema.Types.Mixed },
  },
  { _id: false },
)

/**
 * Historial de correos: UN documento por (email, type) con el historial
 * completo de estados embebido. `latestStatus` y `lastEventAt` están
 * desnormalizados para filtrar/ordenar sin recorrer el arreglo.
 */
const EmailLogSchema = new Schema(
  {
    email: { type: String, required: true },
    type: { type: String, enum: ['invite'], default: 'invite' },
    history: { type: [EmailEventSchema], default: [] },
    latestStatus: {
      type: String,
      enum: EMAIL_STATUSES,
      default: 'pending',
    },
    lastEventAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
)

EmailLogSchema.index({ email: 1, type: 1 }, { unique: true })
EmailLogSchema.index({ lastEventAt: -1 })

export type IEmailLog = InferSchemaType<typeof EmailLogSchema>

export const EmailLog = (models.EmailLog ||
  model('EmailLog', EmailLogSchema)) as mongoose.Model<IEmailLog>
