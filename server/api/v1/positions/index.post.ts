import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import { validateWithSchema, z } from '~~/server/utils/validation-schemas'
import { Position } from '~~/server/models/Position'

const createSchema = z.object({
  title: z.string().trim().min(2, 'El título del cargo es requerido').max(80),
  departmentId: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
  description: z.string().trim().max(400).optional().default(''),
  functions: z.array(z.string().trim().min(1).max(200)).max(30).optional().default([]),
  requirements: z.array(z.string().trim().min(1).max(200)).max(30).optional().default([]),
  minSalary: z.number().min(0).nullable().optional().default(null),
  maxSalary: z.number().min(0).nullable().optional().default(null),
})

export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN])
  const tenantId = await getTenantId(event)
  const data = validateWithSchema(createSchema, await readBody(event))

  const position = await Position.create({
    tenantId,
    title: data.title,
    department: data.departmentId ?? null,
    description: data.description,
    functions: data.functions,
    requirements: data.requirements,
    minSalary: data.minSalary,
    maxSalary: data.maxSalary,
  })

  return { id: String(position._id) }
})
