import mongoose from 'mongoose'
import type { InferSchemaType } from 'mongoose'

const { Schema, model, models } = mongoose

const AuditLogSchema = new Schema(
  {
    module: {
      type: String,
      enum: ['company', 'legal-params', 'shift', 'payroll'],
      required: true,
    },
    action: {
      type: String,
      enum: [
        'create',
        'update',
        'activate',
        'assign',
        'unassign',
        'approve',
        'pay',
        'cancel',
        'recalculate',
      ],
      required: true,
    },
    entityId: { type: Schema.Types.ObjectId },
    userId: { type: String },
    userName: { type: String },
    description: { type: String },
    /** Diferencias antes/después o resumen del cambio. */
    changes: { type: Schema.Types.Mixed },
  },
  { timestamps: true, versionKey: false },
)

AuditLogSchema.index({ module: 1, createdAt: -1 })

export type IAuditLog = InferSchemaType<typeof AuditLogSchema>

export const AuditLog = (models.AuditLog ||
  model('AuditLog', AuditLogSchema)) as mongoose.Model<IAuditLog>
