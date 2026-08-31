import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import { logAudit } from '~~/server/utils/audit'
import { EvaluationCampaign } from '~~/server/models/EvaluationCampaign'

export default defineEventHandler(async (event) => {
  const { userId } = await authorize(event, [ROLES.ADMIN, ROLES.HR])
  const tenantId = await getTenantId(event)
  const id = String(getRouterParam(event, 'id') ?? '')
  const session = await getUserSession(event)
  const userName = (session.user as { name?: string } | undefined)?.name ?? ''

  const campaign = await EvaluationCampaign.findOne({ _id: id, tenantId }).lean()
  if (!campaign) {
    throw createError({ statusCode: 404, message: 'Campaña no encontrada' })
  }
  await EvaluationCampaign.deleteOne({ _id: id, tenantId })

  await logAudit({
    module: 'evaluation-campaign',
    action: 'delete',
    entityId: String(campaign._id),
    userId,
    userName,
    description: `Campaña eliminada: ${campaign.name}`,
    changes: {},
  })

  return { success: true }
})
