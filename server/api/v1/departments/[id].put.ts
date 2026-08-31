import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import { validateWithSchema, z } from '~~/server/utils/validation-schemas'
import { Department } from '~~/server/models/Department'

const updateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  code: z.string().trim().max(20).optional().default(''),
  description: z.string().trim().max(300).optional().default(''),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido')
    .optional()
    .default('#1867C0'),
  managerId: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
  active: z.boolean().optional().default(true),
})

export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN])
  const tenantId = await getTenantId(event)
  const id = String(getRouterParam(event, 'id') ?? '')
  const data = validateWithSchema(updateSchema, await readBody(event))

  const department = await Department.findOneAndUpdate(
    { _id: id, tenantId },
    {
      $set: {
        name: data.name,
        code: data.code,
        description: data.description,
        color: data.color,
        manager: data.managerId ?? null,
        active: data.active,
      },
    },
    { new: true },
  )
  if (!department) throw createError({ statusCode: 404, message: 'Área no encontrada' })
  return { success: true }
})
