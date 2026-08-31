import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import { EvaluationCampaign } from '~~/server/models/EvaluationCampaign'

/** Lista de campañas de evaluación del tenant. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])
  const tenantId = await getTenantId(event)
  const campaigns = await EvaluationCampaign.find({ tenantId })
    .sort({ createdAt: -1 })
    .lean()
  return {
    items: campaigns.map((campaign) => ({
      id: String(campaign._id),
      name: campaign.name,
      description: campaign.description ?? '',
      status: campaign.status,
      startDate: campaign.startDate ?? null,
      endDate: campaign.endDate ?? null,
      dueDate: campaign.dueDate ?? null,
      scope: campaign.scope,
      areaIds: campaign.areaIds ?? [],
      evaluatorRule: campaign.evaluatorRule,
      allowSelfEvaluation: campaign.allowSelfEvaluation ?? false,
      generatedCount: campaign.generatedCount ?? 0,
      createdAt: campaign.createdAt,
    })),
  }
})
