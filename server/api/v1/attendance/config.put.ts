import { Company } from '~~/server/models/Company'
import { ROLES } from '~~/shared/auth'
import { getTenantId, requireFlag } from '~~/server/utils/tenant'
import { FEATURE_FLAGS } from '~~/shared/feature-flags'
import { recomputeLatenessForUnsettled } from '~~/server/services/attendance.service'

/** Actualiza la tolerancia de llegada tarde del módulo de asistencia. */
export default defineEventHandler(async (event) => {
  await requireFlag(
    event,
    [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR],
    FEATURE_FLAGS.ATTENDANCE,
  )

  const body = await readBody(event)
  const value = Number(body?.lateToleranceMinutes)
  if (!Number.isFinite(value) || value < 0 || value > 120) {
    throw createError({
      statusCode: 400,
      message: 'La tolerancia debe estar entre 0 y 120 minutos.',
    })
  }
  const closedThrough = String(body?.attendanceClosedThrough ?? '').trim()
  if (closedThrough && !/^\d{4}-(0[1-9]|1[0-2])$/.test(closedThrough)) {
    throw createError({
      statusCode: 400,
      message: 'El cierre de asistencia debe tener formato YYYY-MM.',
    })
  }

  const company = await Company.getConfig()
  if (!company) {
    throw createError({ statusCode: 404, message: 'No hay empresa configurada.' })
  }

  company.workSchedule = {
    ...company.workSchedule,
    lateToleranceMinutes: Math.round(value),
  } as never
  company.attendanceClosedThrough = closedThrough
  await company.save()

  // Recalcula solo asistencias de períodos NO liquidados: los meses con
  // nómina aprobada/pagada conservan su evaluación original.
  const tenantId = await getTenantId(event)
  const recomputed = tenantId
    ? await recomputeLatenessForUnsettled(tenantId, Math.round(value))
    : 0

  return {
    lateToleranceMinutes: company.workSchedule.lateToleranceMinutes,
    attendanceClosedThrough: company.attendanceClosedThrough,
    recomputed,
  }
})
