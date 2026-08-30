import { Absence } from '~~/server/models/Absence'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import {
  absenceUpdateSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'
import {
  calculateAbsenceValues,
  getAbsenceDays,
} from '~~/server/services/absence.service'
import { Company } from '~~/server/models/Company'
import { Employee } from '~~/server/models/Employee'
import { getTenantId } from '~~/server/utils/tenant'
import { ABSENCE_TYPES, type AbsenceType } from '~~/shared/absence'

interface IAbsencePolicies {
  employerPaidIncapacidadDays?: number
  restDaySurchargeOverride?: number | null
}

/**
 * Actualiza una ausencia (solo pendiente). Recalcula días y valores
 * cuando cambian tipo/fechas. Acceso: admin, manager, hr.
 */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const data = validateWithSchema(absenceUpdateSchema, body)

  const absence = await Absence.findById(id)
  if (!absence) {
    throw createError({ statusCode: 404, message: 'Ausencia no encontrada' })
  }
  if (absence.status !== 'pending') {
    throw createError({
      statusCode: 400,
      message: 'Solo se puede editar una ausencia pendiente.',
    })
  }

  const type = (data.type ?? absence.type) as AbsenceType
  const startDate = data.startDate ?? absence.startDate
  const endDate = data.endDate ?? absence.endDate

  if (data.type !== undefined) absence.type = data.type
  if (data.startDate !== undefined) absence.startDate = data.startDate
  if (data.endDate !== undefined) absence.endDate = data.endDate
  if (data.scheduledRestDate !== undefined)
    absence.scheduledRestDate = data.scheduledRestDate
  if (data.supportDocument !== undefined)
    absence.supportDocument = data.supportDocument
  if (data.observations !== undefined) absence.observations = data.observations

  const employee = await Employee.findById(absence.employee).select('baseSalary diaDescanso')
  const tenantId = await getTenantId(event)
  const company = tenantId ? await Company.findById(tenantId) : null
  const policy = (company?.absencePolicies ?? {}) as IAbsencePolicies
  const days = getAbsenceDays(
    type,
    startDate,
    endDate,
    employee?.diaDescanso ?? 0,
  )
  absence.days = days

  const values = calculateAbsenceValues(
    type,
    employee?.baseSalary ?? 0,
    days,
    {
      employerPaidIncapacidadDays: policy.employerPaidIncapacidadDays ?? 2,
      restDaySurchargeOverride: policy.restDaySurchargeOverride ?? null,
      restDayWorkedDate:
        type === ABSENCE_TYPES.DESCANSO_COMPENSATORIO
          ? absence.scheduledRestDate ?? startDate
          : null,
    },
  )
  absence.paidByCompanyDays = values.paidByCompanyDays ?? 0
  absence.companyPaidValue = values.companyPaidValue ?? 0
  absence.epsValue = values.epsValue ?? 0
  absence.arlValue = values.arlValue ?? 0
  absence.surchargePaid = values.surchargePaid ?? false

  await absence.save()
  return absence.toJSON()
})
