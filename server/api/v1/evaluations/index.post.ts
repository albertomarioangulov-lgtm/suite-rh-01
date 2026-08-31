import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import { validateWithSchema, z, mongoIdSchema } from '~~/server/utils/validation-schemas'
import { Evaluation } from '~~/server/models/Evaluation'
import { computeOverallScore } from '~~/server/services/evaluation.service'
import { logAudit } from '~~/server/utils/audit'

const scoreItemSchema = z.object({
  itemId: z.string().min(1),
  description: z.string().max(300).optional().default(''),
  score: z.number().int().min(1).max(5).nullable().optional().default(null),
})

const scoreSectionSchema = z.object({
  sectionId: z.string().min(1),
  sectionTitle: z.string().max(120).optional().default(''),
  sectionWeight: z.number().min(0).max(100).optional().default(0),
  items: z.array(scoreItemSchema).optional().default([]),
})

const createSchema = z.object({
  employeeId: mongoIdSchema,
  evaluatorId: mongoIdSchema.nullable().optional().default(null),
  periodLabel: z.string().trim().min(2, 'El período es requerido').max(80),
  templateId: mongoIdSchema.nullable().optional().default(null),
  positionId: mongoIdSchema.nullable().optional().default(null),
  sections: z.array(scoreSectionSchema).optional().default([]),
  recommendations: z.string().max(2000).optional().default(''),
  actionPlan: z.string().max(2000).optional().default(''),
})

export default defineEventHandler(async (event) => {
  const { userId } = await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])
  const tenantId = await getTenantId(event)
  const data = validateWithSchema(createSchema, await readBody(event))

  const evaluation = await Evaluation.create({
    tenantId,
    employee: data.employeeId,
    evaluator: data.evaluatorId ?? userId,
    periodLabel: data.periodLabel,
    templateId: data.templateId ?? null,
    positionId: data.positionId ?? null,
    sections: data.sections,
    recommendations: data.recommendations,
    actionPlan: data.actionPlan,
    overallScore: computeOverallScore(data.sections),
  })

  const session = await getUserSession(event)
  const userName = (session.user as { name?: string } | undefined)?.name ?? ''
  await logAudit({
    module: 'evaluation',
    action: 'create',
    entityId: String(evaluation._id),
    userId,
    userName,
    description: `Evaluación creada (${data.periodLabel})`,
    changes: {
      employeeId: data.employeeId,
      templateId: data.templateId ?? null,
      positionId: data.positionId ?? null,
      periodLabel: data.periodLabel,
    },
  })

  return { id: String(evaluation._id) }
})
