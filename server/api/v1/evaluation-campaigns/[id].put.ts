import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import { logAudit } from '~~/server/utils/audit'
import {
  validateWithSchema,
  z,
  mongoIdSchema,
} from '~~/server/utils/validation-schemas'
import { EvaluationCampaign } from '~~/server/models/EvaluationCampaign'

const campaignSchema = z.object({
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(400).optional().default(''),
  status: z.enum(['draft', 'active', 'closed']).default('draft'),
  startDate: z.string().nullable().optional().default(null),
  endDate: z.string().nullable().optional().default(null),
  dueDate: z.string().nullable().optional().default(null),
  scope: z.enum(['all', 'areas']).default('all'),
  areaIds: z.array(mongoIdSchema).max(100).optional().default([]),
  evaluatorRule: z.enum(['manager', 'manual']).default('manager'),
  allowSelfEvaluation: z.boolean().default(false),
})

const toDate = (value: string | null): Date | null =>
  value && value !== '' ? new Date(value) : null

export default defineEventHandler(async (event) => {
  const { userId } = await authorize(event, [ROLES.ADMIN, ROLES.HR])
  const tenantId = await getTenantId(event)
  const id = String(getRouterParam(event, 'id') ?? '')
  const data = validateWithSchema(campaignSchema, await readBody(event))
  const session = await getUserSession(event)
  const userName = (session.user as { name?: string } | undefined)?.name ?? ''

  const before = await EvaluationCampaign.findOne({ _id: id, tenantId }).lean()
  if (!before) {
    throw createError({ statusCode: 404, message: 'Campaña no encontrada' })
  }

  const campaign = await EvaluationCampaign.findOneAndUpdate(
    { _id: id, tenantId },
    {
      $set: {
        name: data.name,
        description: data.description,
        status: data.status,
        startDate: toDate(data.startDate),
        endDate: toDate(data.endDate),
        dueDate: toDate(data.dueDate),
        scope: data.scope,
        areaIds: data.areaIds,
        evaluatorRule: data.evaluatorRule,
        allowSelfEvaluation: data.allowSelfEvaluation,
      },
    },
    { new: true },
  )

  await logAudit({
    module: 'evaluation-campaign',
    action: 'update',
    entityId: String(campaign._id),
    userId,
    userName,
    description: `Campaña actualizada: ${campaign.name}`,
    changes: { before: before, after: campaign.toJSON() },
  })

  return { success: true }
})
