import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import { Evaluation } from '~~/server/models/Evaluation'
import { logAudit } from '~~/server/utils/audit'

/** Aprueba una evaluación (solo admin/manager). */
export default defineEventHandler(async (event) => {
  const { userId } = await authorize(event, [ROLES.ADMIN, ROLES.MANAGER])
  const tenantId = await getTenantId(event)
  const id = String(getRouterParam(event, 'id') ?? '')

  const evaluation = await Evaluation.findOne({ _id: id, tenantId })
  if (!evaluation) {
    throw createError({ statusCode: 404, message: 'Evaluación no encontrada' })
  }
  if (evaluation.status !== 'completed') {
    throw createError({
      statusCode: 400,
      message: 'Solo se puede aprobar una evaluación completada.',
    })
  }

  evaluation.status = 'approved'
  evaluation.approvedBy = userId
  evaluation.approvedAt = new Date()
  await evaluation.save()

  const session = await getUserSession(event)
  const userName = (session.user as { name?: string } | undefined)?.name ?? ''
  await logAudit({
    module: 'evaluation',
    action: 'approve',
    entityId: String(evaluation._id),
    userId,
    userName,
    description: `Evaluación aprobada (${evaluation.periodLabel})`,
    changes: { overallScore: evaluation.overallScore },
  })

  return { success: true }
})
