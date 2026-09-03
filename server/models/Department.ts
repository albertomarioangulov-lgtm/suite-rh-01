import mongoose from 'mongoose'
import type { InferSchemaType } from 'mongoose'

const { Schema, model, models } = mongoose

/** Área o departamento de la empresa. */
const DepartmentSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    code: { type: String, trim: true, maxlength: 20, default: '' },
    description: { type: String, trim: true, maxlength: 300, default: '' },
    /** Sede a la que pertenece el área (ADR-002). */
    sedeId: { type: Schema.Types.ObjectId, ref: 'Site', default: null, index: true },
    /** Color identificador del área (hex) para gráficos y organigrama. */
    color: { type: String, default: '#1867C0', match: /^#[0-9a-fA-F]{6}$/ },
    /** Responsable del área (opcional). */
    manager: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
)

DepartmentSchema.index({ tenantId: 1, name: 1 }, { unique: true })

export type IDepartment = InferSchemaType<typeof DepartmentSchema>

export const Department = (models.Department ||
  model('Department', DepartmentSchema)) as mongoose.Model<IDepartment>
