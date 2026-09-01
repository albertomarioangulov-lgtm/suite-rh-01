import { Company } from '~~/server/models/Company'
import { LegalParams } from '~~/server/models/LegalParams'
import { ensureDefaultCycle } from '~~/server/services/payroll-cycle.service'
import type { PayrollFrequency } from '~~/shared/payroll-period'
import type { companyUpdateSchema, legalParamsSchema } from '~~/server/utils/validation-schemas'
import type { z } from 'zod'

type CompanyUpdateInput = z.infer<typeof companyUpdateSchema>
type LegalParamsInput = z.infer<typeof legalParamsSchema>

interface IAbsencePolicies {
  maxDaysPerYear?: Map<string, number>
  employerPaidIncapacidadDays?: number
  restDaySurchargeOverride?: number | null
  requireSupportDocument?: boolean
}

export const getCompanyConfig = async () => {
  const company = await Company.getConfig()
  if (!company) {
    // Estado vacío esperado (primera configuración): null con 200.
    return null
  }
  return company.toJSON()
}

/**
 * Actualiza la configuración activa. Si no existe ninguna, la crea
 * (primer registro). Devuelve también los cambios para el audit log.
 */
export const updateCompanyConfig = async (data: CompanyUpdateInput) => {
  let company = await Company.getConfig()
  const changes: Record<string, { before: unknown; after: unknown }> = {}
  const created = !company

  if (!company) {
    company = await Company.create({
      name: data.name || '',
      nit: data.nit || '',
      logo: data.logo || '',
      address: data.address || '',
      municipalityCode: data.municipalityCode || '',
      payrollFrequency: data.payrollFrequency || 'mensual',
      cenEnvironment: data.cenEnvironment ?? 2,
      softwareId: data.softwareId || '',
      softwareSC: data.softwareSC || '',
      softwarePin: data.softwarePin || '',
      paymentMethod: data.paymentMethod ?? 42,
      taxRegime: data.taxRegime || 'simplified',
      workSchedule: {
        maxWeeklyHours: 42,
        minDailyHours: 6,
        maxDailyHours: 9,
        nightShiftStart: '19:00',
        nightShiftEnd: '06:00',
        ...data.workSchedule,
      },
      active: true,
    })
    await ensureDefaultCycle(
      String(company._id),
      (data.payrollFrequency as PayrollFrequency) ?? 'mensual',
    )
    return { company: company.toJSON(), changes, created }
  }

  if (data.name !== undefined) {
    changes.name = { before: company.name, after: data.name }
    company.name = data.name
  }
  if (data.nit !== undefined) {
    changes.nit = { before: company.nit, after: data.nit }
    company.nit = data.nit
  }
  if (data.logo !== undefined) {
    changes.logo = { before: company.logo, after: data.logo }
    company.logo = data.logo
  }
  if (data.address !== undefined) {
    changes.address = { before: company.address, after: data.address }
    company.address = data.address
  }
  if (data.municipalityCode !== undefined) {
    changes.municipalityCode = {
      before: company.municipalityCode,
      after: data.municipalityCode,
    }
    company.municipalityCode = data.municipalityCode
  }
  if (data.payrollFrequency !== undefined) {
    changes.payrollFrequency = {
      before: company.payrollFrequency,
      after: data.payrollFrequency,
    }
    company.payrollFrequency = data.payrollFrequency
    await ensureDefaultCycle(
      String(company._id),
      data.payrollFrequency as PayrollFrequency,
    )
  }
  if (data.cenEnvironment !== undefined) {
    changes.cenEnvironment = {
      before: company.cenEnvironment,
      after: data.cenEnvironment,
    }
    company.cenEnvironment = data.cenEnvironment
  }
  if (data.softwareId !== undefined) {
    changes.softwareId = {
      before: company.softwareId,
      after: data.softwareId,
    }
    company.softwareId = data.softwareId ?? ''
  }
  if (data.softwareSC !== undefined) {
    changes.softwareSC = {
      before: company.softwareSC,
      after: data.softwareSC,
    }
    company.softwareSC = data.softwareSC ?? ''
  }
  if (data.softwarePin !== undefined) {
    changes.softwarePin = {
      before: company.softwarePin,
      after: data.softwarePin,
    }
    company.softwarePin = data.softwarePin ?? ''
  }
  if (data.paymentMethod !== undefined) {
    changes.paymentMethod = {
      before: company.paymentMethod,
      after: data.paymentMethod,
    }
    company.paymentMethod = data.paymentMethod
  }
  if (data.taxRegime !== undefined) {
    changes.taxRegime = { before: company.taxRegime, after: data.taxRegime }
    company.taxRegime = data.taxRegime
  }
  if (data.workSchedule) {
    const before = { ...company.workSchedule }
    const current = company.workSchedule ?? {
      maxWeeklyHours: 42,
      minDailyHours: 6,
      maxDailyHours: 9,
      nightShiftStart: '19:00',
      nightShiftEnd: '06:00',
    }
    company.workSchedule = {
      maxWeeklyHours: data.workSchedule.maxWeeklyHours ?? current.maxWeeklyHours,
      minDailyHours: data.workSchedule.minDailyHours ?? current.minDailyHours,
      maxDailyHours: data.workSchedule.maxDailyHours ?? current.maxDailyHours,
      nightShiftStart: data.workSchedule.nightShiftStart ?? current.nightShiftStart,
      nightShiftEnd: data.workSchedule.nightShiftEnd ?? current.nightShiftEnd,
    }
    changes.workSchedule = { before, after: { ...company.workSchedule } }
  }
  if (data.absencePolicies) {
    const before = company.absencePolicies ?? ({} as IAbsencePolicies)
    const current = (company.absencePolicies ?? {}) as IAbsencePolicies
    const nextPolicies: IAbsencePolicies = {
      maxDaysPerYear: new Map(
        Object.entries({
          ...(current.maxDaysPerYear instanceof Map
            ? Object.fromEntries(current.maxDaysPerYear)
            : {}),
          ...data.absencePolicies.maxDaysPerYear,
        }),
      ),
      employerPaidIncapacidadDays:
        data.absencePolicies.employerPaidIncapacidadDays ??
        current.employerPaidIncapacidadDays ??
        2,
      restDaySurchargeOverride:
        data.absencePolicies.restDaySurchargeOverride !== undefined
          ? data.absencePolicies.restDaySurchargeOverride
          : (current.restDaySurchargeOverride ?? null),
      requireSupportDocument:
        data.absencePolicies.requireSupportDocument ??
        current.requireSupportDocument ??
        false,
    }
    company.absencePolicies = nextPolicies as never
    changes.absencePolicies = { before, after: { ...nextPolicies } }
  }

  await company.save()
  return { company: company.toJSON(), changes, created }
}

export const getCurrentLegalParams = async () => {
  const params = await LegalParams.getCurrent()
  if (!params) {
    // Estado vacío esperado: null con 200.
    return null
  }
  return params.toJSON()
}

export const getHistoricalLegalParams = async () => {
  const params = await LegalParams.getHistorical()
  return params.map((param) => param.toJSON())
}

/**
 * Crea un nuevo período. No sobrescribe el vigente: se crea inactivo
 * (salvo que sea el primero) y se activa explícitamente por separado.
 */
export const createLegalParams = async (data: LegalParamsInput) => {
  const existing = await LegalParams.findOne({ validFrom: data.validFrom })
  if (existing) {
    throw createError({
      statusCode: 409,
      message: 'Ya existe un período con esa fecha de inicio.',
    })
  }

  const current = await LegalParams.getCurrent()
  const params = await LegalParams.create({
    ...data,
    validTo: null,
    active: !current,
  })

  return params.toJSON()
}

export const activateLegalParams = async (id: string) => {
  const target = await LegalParams.findById(id)
  if (!target) {
    throw createError({
      statusCode: 404,
      message: 'Período de parámetros no encontrado.',
    })
  }

  await LegalParams.updateMany(
    { _id: { $ne: id }, active: true },
    { $set: { active: false, validTo: new Date() } },
  )

  target.active = true
  target.validTo = null
  await target.save()

  return target.toJSON()
}
