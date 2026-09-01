import ExcelJS from 'exceljs'
import { Payroll } from '~~/server/models/Payroll'
import { Employee } from '~~/server/models/Employee'
import { Company } from '~~/server/models/Company'
import { ROLES } from '~~/shared/auth'
import { getTenantId, requireFlag } from '~~/server/utils/tenant'
import { FEATURE_FLAGS } from '~~/shared/feature-flags'
import { buildNominaExportRows } from '~~/server/services/nomina-export.service'

const columnLetter = (index: number) => {
  let letters = ''
  let n = index
  while (n > 0) {
    const rem = (n - 1) % 26
    letters = String.fromCharCode(65 + rem) + letters
    n = Math.floor((n - 1) / 26)
  }
  return letters
}

/**
 * Planilla de nómina electrónica (Excel): una fila por empleado con todos
 * los campos del DSNE, para trasladar a la herramienta web gratuita de la
 * DIAN mientras el software no esté habilitado.
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
      'firstName lastName document documentType employeeType subEmployeeType salarioIntegral contractType hireDate',
    )
    .lean()

  const rows = buildNominaExportRows({
    payroll,
    company,
    employees,
    entries: payroll.employees ?? [],
  })
  if (rows.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'La nómina no tiene empleados para exportar.',
    })
  }

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Nómina electrónica')
  const keys = Object.keys(rows[0])
  sheet.columns = keys.map((key) => ({ header: key, key, width: 24 }))
  sheet.addRows(rows)
  sheet.getRow(1).font = { bold: true }
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE8F1FB' },
  }
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
  sheet.autoFilter = {
    from: 'A1',
    to: `${columnLetter(keys.length)}${rows.length + 1}`,
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const start = String(payroll.periodStart.toISOString().slice(0, 10))
  const end = String(payroll.periodEnd.toISOString().slice(0, 10))
  setHeader(
    event,
    'content-type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  setHeader(
    event,
    'content-disposition',
    `attachment; filename="NominaElectronica_${company.nit}_${start}_${end}.xlsx"`,
  )
  return Buffer.from(buffer)
})
