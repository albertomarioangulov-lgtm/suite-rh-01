import { Payroll } from '~~/server/models/Payroll'
import { Employee } from '~~/server/models/Employee'
import { Company } from '~~/server/models/Company'
import { ROLES } from '~~/shared/auth'
import { getTenantId, requireFlag } from '~~/server/utils/tenant'
import { FEATURE_FLAGS } from '~~/shared/feature-flags'
import { buildCenXml } from '~~/server/services/cen.service'

/** Códigos DIAN de TipoContrato (tabla 5.5.2 del anexo técnico). */
const CONTRACT_TYPE_CODES: Record<string, number> = {
  indefinite: 2,
  fixed: 1,
  work_labor: 3,
  intern: 4,
}

/** Códigos DIAN de PeriodoNomina (tabla 5.5.1 del anexo técnico). */
const PAYROLL_FREQUENCY_CODES: Record<string, number> = {
  semanal: 1,
  decenal: 2,
  catorcenal: 3,
  quincenal: 4,
  mensual: 5,
  otro: 6,
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Descarga el Documento Soporte de Pago de Nómina Electrónica (DSNE) de un
 * empleado dentro de una nómina. Estructura oficial `NominaIndividual`
 * (TipoXML 102) con DV del NIT y numeración correlativa anual, sin CUNE ni
 * firma (pendiente M3/M4).
 */
export default defineEventHandler(async (event) => {
  await requireFlag(
    event,
    [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR],
    FEATURE_FLAGS.PAYROLL,
  )

  const tenantId = await getTenantId(event)
  const id = String(getRouterParam(event, 'id') ?? '')
  const employeeId = String(getQuery(event).employeeId ?? '')
  if (!tenantId || !employeeId) {
    throw createError({ statusCode: 400, message: 'Falta el empleado.' })
  }

  const payroll = await Payroll.findOne({ _id: id, tenantId })
  if (!payroll) {
    throw createError({ statusCode: 404, message: 'Nómina no encontrada' })
  }
  const entry = (payroll.employees ?? []).find(
    (item) => String(item.employee) === employeeId,
  )
  if (!entry) {
    throw createError({
      statusCode: 404,
      message: 'Empleado no encontrado en la nómina',
    })
  }

  const [employee, company] = await Promise.all([
    Employee.findById(employeeId)
      .select(
        'firstName lastName document documentType employeeType subEmployeeType salarioIntegral bankName accountType accountNumber hireDate contractType baseSalary',
      )
      .lean(),
    Company.getConfig(),
  ])
  if (!employee || !company) {
    throw createError({ statusCode: 404, message: 'Datos incompletos' })
  }

  const municipalityCode = company.municipalityCode?.trim() ?? ''
  if (!/^\d{5}$/.test(municipalityCode)) {
    throw createError({
      statusCode: 400,
      message:
        'Configura el código de municipio (DIVIPOLA, 5 dígitos) en la configuración de la empresa antes de generar el DSNE.',
    })
  }

  const start = String(payroll.periodStart.toISOString().slice(0, 10))
  const end = String(payroll.periodEnd.toISOString().slice(0, 10))
  const year = end.slice(0, 4)

  // Numeración correlativa anual, atómica por empresa. Si cambió el año se
  // reinicia el consecutivo; el bucle cubre la carrera entre el reinicio y
  // el incremento sin duplicar secuencias.
  let sequence = 1
  for (let attempt = 0; attempt < 3; attempt++) {
    const bumped = await Company.findOneAndUpdate(
      { _id: company._id, cenSequenceYear: year },
      { $inc: { cenSequence: 1 } },
      { new: true },
    ).lean()
    if (bumped) {
      sequence = bumped.cenSequence ?? 1
      break
    }
    await Company.findOneAndUpdate(
      { _id: company._id },
      { $set: { cenSequenceYear: year, cenSequence: 0 } },
    ).lean()
  }

  const hireDate = employee.hireDate
    ? String(employee.hireDate.toISOString().slice(0, 10))
    : undefined
  const tiempoLaborado = hireDate
    ? Math.max(
        1,
        Math.round(
          (new Date(`${end}T00:00:00Z`).getTime() -
            new Date(`${hireDate}T00:00:00Z`).getTime()) /
            DAY_MS,
        ) + 1,
      )
    : (entry.devengados?.daysWorked ?? 0)

  // Hora local de Colombia (UTC-5, sin horario de verano).
  const now = new Date()
  const colombiaTime = new Date(now.getTime() - 5 * 60 * 60 * 1000)
  const generationDate = colombiaTime.toISOString().slice(0, 10)
  const generationTime = `${colombiaTime.toISOString().slice(11, 19)}-05:00`

  const xml = buildCenXml({
    sequence,
    generationDate,
    generationTime,
    softwareId: company.softwareId || undefined,
    softwareSC: company.softwareSC || undefined,
    environment: (company.cenEnvironment ?? 2) as 1 | 2,
    payrollFrequencyCode:
      PAYROLL_FREQUENCY_CODES[company.payrollFrequency ?? 'mensual'] ?? 5,
    paymentMethod: company.paymentMethod ?? 42,
    company: {
      name: company.name,
      nit: company.nit,
      address: company.address,
      municipalityCode,
    },
    employee: {
      document: employee.document,
      documentType: employee.documentType ?? 13,
      employeeType: employee.employeeType ?? '01',
      subEmployeeType: employee.subEmployeeType ?? '00',
      salarioIntegral: employee.salarioIntegral ?? false,
      bankName: employee.bankName ?? undefined,
      accountType: employee.accountType ?? undefined,
      accountNumber: employee.accountNumber ?? undefined,
      firstName: employee.firstName,
      lastName: employee.lastName,
      hireDate,
      contractTypeCode:
        CONTRACT_TYPE_CODES[employee.contractType ?? 'indefinite'] ?? 2,
      baseSalary: employee.baseSalary ?? 0,
    },
    period: { start, end },
    daysWorked: entry.devengados?.daysWorked ?? 0,
    tiempoLaborado,
    devengados: {
      baseSalary: entry.devengados?.baseSalary ?? 0,
      transportAllowance: entry.devengados?.transportAllowance ?? 0,
      overtimeDay: entry.devengados?.overtimeDay ?? 0,
      overtimeNight: entry.devengados?.overtimeNight ?? 0,
      nightSurcharge: entry.devengados?.nightSurcharge ?? 0,
      overtimeDayHours: entry.devengados?.overtimeDayHours ?? 0,
      overtimeNightHours: entry.devengados?.overtimeNightHours ?? 0,
      nightSurchargeHours: entry.devengados?.nightSurchargeHours ?? 0,
      bonuses: entry.devengados?.bonuses ?? 0,
      commissions: entry.devengados?.commissions ?? 0,
      absenceCompanyPaidValue: entry.devengados?.absenceCompanyPaidValue ?? 0,
      absenceEpsValue: entry.devengados?.absenceEpsValue ?? 0,
      absenceArlValue: entry.devengados?.absenceArlValue ?? 0,
      absenceCompanyPaidDays: entry.devengados?.absenceCompanyPaidDays ?? 0,
      absenceEpsDays: entry.devengados?.absenceEpsDays ?? 0,
      absenceArlDays: entry.devengados?.absenceArlDays ?? 0,
      total: entry.devengados?.total ?? 0,
    },
    deducciones: {
      employeeHealth: entry.deducciones?.employeeHealth ?? 0,
      employeePension: entry.deducciones?.employeePension ?? 0,
      sourceRetention: entry.deducciones?.sourceRetention ?? 0,
      garnishments: entry.deducciones?.garnishments ?? 0,
      loans: entry.deducciones?.loans ?? 0,
      total: entry.deducciones?.total ?? 0,
    },
    totalToPay: entry.totalToPay ?? 0,
  })

  const filename = `CEN_${company.nit}_${employee.document}_${start}_${end}.xml`
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'content-disposition', `attachment; filename="${filename}"`)
  return xml
})
