import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import { logAudit } from '~~/server/utils/audit'
import {
  validateWithSchema,
  z,
  mongoIdSchema,
} from '~~/server/utils/validation-schemas'
import { EvaluationConfig } from '~~/server/models/EvaluationConfig'
import { EvaluationConfigHistory } from '~~/server/models/EvaluationConfigHistory'

const configSchema = z.object({
  enabled: z.boolean().default(true),
  frequency: z
    .enum(['monthly', 'quarterly', 'semiannual', 'annual', 'custom'])
    .default('semiannual'),
  cycleStart: z.string().nullable().optional().default(null),
  cycleEnd: z.string().nullable().optional().default(null),
  cycleDue: z.string().nullable().optional().default(null),
  scope: z.enum(['all', 'areas']).default('all'),
  areaIds: z.array(mongoIdSchema).max(100).optional().default([]),
  evaluatorRule: z.enum(['manager', 'manual']).default('manager'),
  allowSelfEvaluation: z.boolean().default(false),
  comment: z.string().trim().max(300).optional().default(''),
})

const toDate = (value: string | null): Date | null =>
  value && value !== '' ? new Date(value) : null

/** Guarda la configuración de evaluaciones y versiona el cambio. */
export default defineEventHandler(async (event) => {
  const { userId } = await authorize(event, [ROLES.ADMIN, ROLES.HR])
  const tenantId = await getTenantId(event)
  const data = validateWithSchema(configSchema, await readBody(event))
  const session = await getUserSession(event)
  const userName = (session.user as { name?: string } | undefined)?.name ?? ''

  const before = await EvaluationConfig.findOne({ tenantId }).lean()
  const beforeSnapshot = before ? { ...before, _id: String(before._id) } : null

  const config = await EvaluationConfig.findOneAndUpdate(
    { tenantId },
    {
      $set: {
        enabled: data.enabled,
        frequency: data.frequency,
        cycleStart: toDate(data.cycleStart),
        cycleEnd: toDate(data.cycleEnd),
        cycleDue: toDate(data.cycleDue),
        scope: data.scope,
        areaIds: data.areaIds,
        evaluatorRule: data.evaluatorRule,
        allowSelfEvaluation: data.allowSelfEvaluation,
        updatedBy: userId,
      },
    },
    { upsert: true, new: true },
  )

  const afterSnapshot = { ...config.toJSON(), _id: String(config._id) }

  await EvaluationConfigHistory.create({
    tenantId,
    configSnapshot: afterSnapshot,
    changes: { before: beforeSnapshot, after: afterSnapshot },
    comment: data.comment,
    userId,
    userName,
  })

  await logAudit({
    module: 'evaluation-config',
    action: 'update',
    entityId: String(config._id),
    userId,
    userName,
    description: 'Actualización de la configuración de evaluaciones',
    changes: { before: beforeSnapshot, after: afterSnapshot },
  })

  return { id: String(config._id), ...afterSnapshot, _id: undefined }
})
