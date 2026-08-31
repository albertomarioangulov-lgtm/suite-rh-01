import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import { paginationSchema, validateWithSchema } from '~~/server/utils/validation-schemas'
import { Evaluation } from '~~/server/models/Evaluation'

/** Lista de evaluaciones del tenant con filtros y paginación. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])
  const tenantId = await getTenantId(event)
  const query = validateWithSchema(paginationSchema, getQuery(event))
  const status = String(getQuery(event).status || '')
  const employeeId = String(getQuery(event).employeeId || '')
  const periodLabel = String(getQuery(event).periodLabel || '')
  const search = query.search || ''

  const filter: Record<string, unknown> = { tenantId }
  if (status) filter.status = status
  if (employeeId) filter.employee = employeeId
  if (periodLabel) filter.periodLabel = periodLabel

  const total = await Evaluation.countDocuments(filter)
  const items = await Evaluation.find(filter)
    .sort({ createdAt: -1 })
    .skip((query.page - 1) * query.limit)
    .limit(query.limit)
    .populate({
      path: 'employee',
      select: 'firstName lastName document department',
      populate: { path: 'department', select: 'name' },
    })
    .populate('evaluator', 'name')
    .lean()

  return {
    items: items.map((evaluation) => ({
      id: String(evaluation._id),
      employeeId: String(evaluation.employee?._id ?? ''),
      employee: evaluation.employee
        ? `${evaluation.employee.firstName ?? ''} ${evaluation.employee.lastName ?? ''}`.trim()
        : 'Empleado',
      document: evaluation.employee?.document ?? '',
      areaName:
        evaluation.employee?.department?.name ??
        (evaluation.employee as { department?: string } | undefined)?.department ??
        '',
      evaluator: evaluation.evaluator?.name ?? '',
      periodLabel: evaluation.periodLabel,
      status: evaluation.status,
      overallScore: evaluation.overallScore ?? 0,
      createdAt: evaluation.createdAt,
    })),
    total,
    page: query.page,
    limit: query.limit,
  }
})
