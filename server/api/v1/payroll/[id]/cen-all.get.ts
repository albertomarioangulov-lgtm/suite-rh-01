import archiver from 'archiver'
import { Payroll } from '~~/server/models/Payroll'
import { Employee } from '~~/server/models/Employee'
import { Company } from '~~/server/models/Company'
import { ROLES } from '~~/shared/auth'
import { getTenantId, requireFlag } from '~~/server/utils/tenant'
import { FEATURE_FLAGS } from '~~/shared/feature-flags'
import { buildCenForEmployee } from '~~/server/services/cen.service'
import { signCenWithCompany } from '~~/server/services/cen-signature.service'

/**
 * Descarga todos los DSNE de la nómina en un ZIP. Si algún empleado falla,
 * se incluye un archivo errores.txt con el motivo y el ZIP se genera con el
 * resto. Si ninguno se genera, responde 400 con el primer error.
 */
export default defineEventHandler(async (event) => {
  await requireFlag(
    event,
    [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR],
    FEATURE_FLAGS.PAYROLL,
  )

  const tenantId = await getTenantId(event)
  const id = String(getRouterParam(event, 'id') ?? '')
  if (!tenantId) {
    throw createError({ statusCode: 400, message: 'Falta el tenant.' })
  }

  const [payroll, company] = await Promise.all([
    Payroll.findOne({ _id: id, tenantId }),
    Company.getConfig(),
  ])
  if (!payroll) {
    throw createError({ statusCode: 404, message: 'Nómina no encontrada' })
  }
  if (!company) {
    throw createError({
      statusCode: 409,
      message: 'Configura primero los datos de la empresa.',
    })
  }

  const employeeIds = (payroll.employees ?? []).map((entry) => entry.employee)
  const employees = await Employee.find({ _id: { $in: employeeIds } })
    .select(
      'firstName lastName document documentType employeeType subEmployeeType salarioIntegral bankName accountType accountNumber hireDate contractType baseSalary',
    )
    .lean()
  const employeesById = new Map(
    employees.map((employee) => [String(employee._id), employee]),
  )

  const files: Array<{ name: string; content: Buffer }> = []
  const errors: string[] = []

  for (const entry of payroll.employees ?? []) {
    const employee = employeesById.get(String(entry.employee))
    if (!employee) {
      errors.push(`${String(entry.employee)}: ficha de empleado no encontrada`)
      continue
    }
    try {
      const { xml, filename } = await buildCenForEmployee({
        payroll,
        company,
        employee,
        entry,
      })
      const { xml: finalXml } = signCenWithCompany(xml, company)
      files.push({ name: filename, content: Buffer.from(finalXml, 'utf-8') })
    } catch (err) {
      const message =
        (err as { message?: string })?.message ?? 'Error al generar el CEN'
      errors.push(
        `${employee.firstName} ${employee.lastName} (${employee.document}): ${message}`,
      )
    }
  }

  if (files.length === 0) {
    throw createError({
      statusCode: 400,
      message: errors[0] ?? 'No se pudo generar ningún CEN.',
    })
  }

  const archive = archiver('zip', { zlib: { level: 9 } })
  const chunks: Buffer[] = []
  archive.on('data', (chunk: Buffer) => chunks.push(chunk))
  const finished = new Promise<void>((resolve, reject) => {
    archive.on('end', () => resolve())
    archive.on('error', (error) => reject(error))
  })

  for (const file of files) {
    archive.append(file.content, { name: file.name })
  }
  if (errors.length > 0) {
    archive.append(Buffer.from(errors.join('\n'), 'utf-8'), {
      name: 'errores.txt',
    })
  }

  await archive.finalize()
  await finished

  const start = String(payroll.periodStart.toISOString().slice(0, 10))
  const end = String(payroll.periodEnd.toISOString().slice(0, 10))
  setHeader(event, 'content-type', 'application/zip')
  setHeader(
    event,
    'content-disposition',
    `attachment; filename="CEN_${company.nit}_${start}_${end}.zip"`,
  )
  return Buffer.concat(chunks)
})
