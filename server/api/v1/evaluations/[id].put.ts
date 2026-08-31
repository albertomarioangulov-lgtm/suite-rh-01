import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import { validateWithSchema, z } from '~~/server/utils/validation-schemas'
import { Evaluation } from '~~/server/models/Evaluation'
import {
  computeOverallScore,
  getMissingItems,
} from '~~/server/services/evaluation.service'

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

const updateSchema = z.object({
  sections: z.array(scoreSectionSchema).optional(),
  recommendations: z.string().max(2000).optional(),
  actionPlan: z.string().max(2000).optional(),
  status: z.enum(['draft', 'completed']).optional(),
})

export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])
  const tenantId = await getTenantId(event)
  const id = String(getRouterParam(event, 'id') ?? '')
  const data = validateWithSchema(updateSchema, await readBody(event))

  const evaluation = await Evaluation.findOne({ _id: id, tenantId })
  if (!evaluation) {
    throw createError({ statusCode: 404, message: 'Evaluación no encontrada' })
  }
  if (evaluation.status === 'approved') {
    throw createError({
      statusCode: 400,
      message: 'Una evaluación aprobada no puede modificarse.',
    })
  }

  if (data.sections !== undefined) evaluation.sections = data.sections
  if (data.recommendations !== undefined) {
    evaluation.recommendations = data.recommendations
  }
  if (data.actionPlan !== undefined) evaluation.actionPlan = data.actionPlan

  if (data.status === 'completed') {
    const missing = getMissingItems(evaluation.sections ?? [])
    if (missing.length > 0) {
      throw createError({
        statusCode: 400,
        message: `Faltan ${missing.length} respuesta(s) para completar la evaluación.`,
      })
    }
    evaluation.status = 'completed'
  }

  evaluation.overallScore = computeOverallScore(evaluation.sections ?? [])
  await evaluation.save()

  return { success: true, overallScore: evaluation.overallScore }
})
