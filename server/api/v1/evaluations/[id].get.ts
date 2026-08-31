import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import { Evaluation } from '~~/server/models/Evaluation'

/** Detalle de una evaluación. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])
  const tenantId = await getTenantId(event)
  const id = String(getRouterParam(event, 'id') ?? '')

  const evaluation = await Evaluation.findOne({ _id: id, tenantId })
    .populate('employee', 'firstName lastName document position')
    .populate('evaluator', 'name')
    .populate('approvedBy', 'name')
    .lean()
  if (!evaluation) {
    throw createError({ statusCode: 404, message: 'Evaluación no encontrada' })
  }

  return {
    id: String(evaluation._id),
    employeeId: String(evaluation.employee?._id ?? ''),
    employeeName: evaluation.employee
      ? `${evaluation.employee.firstName ?? ''} ${evaluation.employee.lastName ?? ''}`.trim()
      : 'Empleado',
    employeePosition: evaluation.employee?.position ?? '',
    evaluator: evaluation.evaluator?.name ?? '',
    approvedBy: evaluation.approvedBy?.name ?? '',
    periodLabel: evaluation.periodLabel,
    periodStart: evaluation.periodStart ?? null,
    periodEnd: evaluation.periodEnd ?? null,
    templateId: evaluation.templateId ? String(evaluation.templateId) : null,
    positionId: evaluation.positionId ? String(evaluation.positionId) : null,
    status: evaluation.status,
    sections: evaluation.sections ?? [],
    recommendations: evaluation.recommendations ?? '',
    actionPlan: evaluation.actionPlan ?? '',
    overallScore: evaluation.overallScore ?? 0,
    approvedAt: evaluation.approvedAt ?? null,
    createdAt: evaluation.createdAt,
  }
})
