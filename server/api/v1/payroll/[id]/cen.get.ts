import { Payroll } from '~~/server/models/Payroll'
import { Employee } from '~~/server/models/Employee'
import { Company } from '~~/server/models/Company'
import { ROLES } from '~~/shared/auth'
import { getTenantId, requireFlag } from '~~/server/utils/tenant'
import { FEATURE_FLAGS } from '~~/shared/feature-flags'
import { buildCenXml } from '~~/server/services/cen.service'

/**
 * Descarga el CEN (XML) de un empleado dentro de una nómina.
 * Versión inicial: estructura del CEN, sin firma ni validación XSD oficial.
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
      .select('firstName lastName document position')
      .lean(),
    Company.getConfig(),
  ])
  if (!employee || !company) {
    throw createError({ statusCode: 404, message: 'Datos incompletos' })
  }

  const index =
    (payroll.employees ?? []).findIndex(
      (item) => String(item.employee) === employeeId,
    ) + 1
  const start = String(payroll.periodStart.toISOString().slice(0, 10))
  const end = String(payroll.periodEnd.toISOString().slice(0, 10))

  const xml = buildCenXml({
    sequence: index,
    company: {
      name: company.name,
      nit: company.nit,
      address: company.address,
    },
    employee: {
      document: employee.document,
      firstName: employee.firstName,
      lastName: employee.lastName,
      position: employee.position,
    },
    period: { start, end },
    daysWorked: entry.devengados?.daysWorked ?? 0,
    devengados: {
      baseSalary: entry.devengados?.baseSalary ?? 0,
      transportAllowance: entry.devengados?.transportAllowance ?? 0,
      overtimeDay: entry.devengados?.overtimeDay ?? 0,
      overtimeNight: entry.devengados?.overtimeNight ?? 0,
      nightSurcharge: entry.devengados?.nightSurcharge ?? 0,
      bonuses: entry.devengados?.bonuses ?? 0,
      commissions: entry.devengados?.commissions ?? 0,
      absenceCompanyPaidValue: entry.devengados?.absenceCompanyPaidValue ?? 0,
      absenceEpsValue: entry.devengados?.absenceEpsValue ?? 0,
      absenceArlValue: entry.devengados?.absenceArlValue ?? 0,
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
    seguridadSocial: {
      employerHealth: entry.seguridadSocial?.employerHealth ?? 0,
      employerPension: entry.seguridadSocial?.employerPension ?? 0,
      arl: entry.seguridadSocial?.arl ?? 0,
      sena: entry.seguridadSocial?.sena ?? 0,
      icbf: entry.seguridadSocial?.icbf ?? 0,
      compensationFund: entry.seguridadSocial?.compensationFund ?? 0,
      total: entry.seguridadSocial?.total ?? 0,
    },
    totalToPay: entry.totalToPay ?? 0,
  })

  const filename = `CEN_${company.nit}_${employee.document}_${start}_${end}.xml`
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'content-disposition', `attachment; filename="${filename}"`)
  return xml
})
