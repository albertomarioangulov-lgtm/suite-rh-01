import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import { validateWithSchema, z } from '~~/server/utils/validation-schemas'
import { EvaluationTemplate } from '~~/server/models/EvaluationTemplate'

const templateItemSchema = z.object({
  id: z.string().min(1),
  description: z.string().trim().min(1, 'El item no puede estar vacío').max(300),
  order: z.number().int().min(0).default(0),
})

const templateSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1, 'El título de la sección es requerido').max(120),
  description: z.string().trim().max(300).optional().default(''),
  order: z.number().int().min(0).default(0),
  weight: z.number().min(0).max(100),
  items: z.array(templateItemSchema).min(1, 'Cada sección debe tener al menos un item'),
})

const createSchema = z.object({
  name: z.string().trim().min(2, 'El nombre es requerido').max(120),
  description: z.string().trim().max(300).optional().default(''),
  positionId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Cargo inválido'),
  sections: z.array(templateSectionSchema).min(1, 'Agrega al menos una sección'),
  active: z.boolean().default(true),
})

export default defineEventHandler(async (event) => {
  const { userId } = await authorize(event, [ROLES.ADMIN])
  const tenantId = await getTenantId(event)
  const data = validateWithSchema(createSchema, await readBody(event))

  const totalWeight = data.sections.reduce((sum, section) => sum + section.weight, 0)
  if (totalWeight !== 100) {
    throw createError({
      statusCode: 400,
      message: `Los pesos de las secciones deben sumar 100 (actual: ${totalWeight}).`,
    })
  }

  if (data.active) {
    const existing = await EvaluationTemplate.findOne({
      tenantId,
      positionId: data.positionId,
      active: true,
    })
    if (existing) {
      throw createError({
        statusCode: 400,
        message: 'Ya existe una plantilla activa para este cargo.',
      })
    }
  }

  const template = await EvaluationTemplate.create({
    tenantId,
    name: data.name,
    description: data.description,
    positionId: data.positionId,
    sections: data.sections,
    active: data.active,
    createdBy: userId ?? null,
  })

  return { id: String(template._id) }
})
