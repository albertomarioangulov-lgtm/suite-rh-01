import { Company } from '~~/server/models/Company'
import { ROLES } from '~~/shared/auth'
import { requireFlag } from '~~/server/utils/tenant'
import { FEATURE_FLAGS } from '~~/shared/feature-flags'

/** Configuración del módulo de asistencia (tolerancia de llegada tarde). */
export default defineEventHandler(async (event) => {
  await requireFlag(
    event,
    [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR],
    FEATURE_FLAGS.ATTENDANCE,
  )

  const company = await Company.getConfig()
  return {
    lateToleranceMinutes: company?.workSchedule?.lateToleranceMinutes ?? 5,
    attendanceClosedThrough: company?.attendanceClosedThrough ?? '',
  }
})
