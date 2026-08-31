import mongoose from 'mongoose'
import type { InferSchemaType } from 'mongoose'

const { Schema, model, models } = mongoose

/**
 * Mensajes del formulario público de contacto (landing).
 * Se almacenan como texto plano; nunca se renderizan como HTML.
 */
const ContactMessageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
    company: { type: String, trim: true, maxlength: 120, default: '' },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    /** Dirección IP de origen (para control de abuso). */
    ip: { type: String, trim: true, default: '' },
    /** User-Agent del navegador de origen. */
    userAgent: { type: String, trim: true, maxlength: 300, default: '' },
    status: { type: String, enum: ['new', 'read'], default: 'new' },
  },
  { timestamps: true, versionKey: false },
)

ContactMessageSchema.index({ status: 1, createdAt: -1 })

export type IContactMessage = InferSchemaType<typeof ContactMessageSchema>

export const ContactMessage = (models.ContactMessage ||
  model('ContactMessage', ContactMessageSchema)) as mongoose.Model<IContactMessage>
