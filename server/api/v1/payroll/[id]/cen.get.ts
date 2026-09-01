import { Payroll } from '~~/server/models/Payroll'
import { Employee } from '~~/server/models/Employee'
import { Company } from '~~/server/models/Company'
import { ROLES } from '~~/shared/auth'
import { getTenantId, requireFlag } from '~~/server/utils/tenant'
import { FEATURE_FLAGS } from '~~/shared/feature-flags'
import { buildCenForEmployee } from '~~/server/services/cen.service'
import { signCenWithCompany } from '~~/server/services/cen-signature.service'

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

  const { xml, filename } = await buildCenForEmployee({
    payroll,
    company,
    employee,
    entry,
  })
  const { xml: finalXml } = signCenWithCompany(xml, company)

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'content-disposition', `attachment; filename="${filename}"`)
  return finalXml
})
