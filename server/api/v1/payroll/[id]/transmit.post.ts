import archiver from 'archiver'
import { Payroll } from '~~/server/models/Payroll'
import { Employee } from '~~/server/models/Employee'
import { Company } from '~~/server/models/Company'
import { ROLES } from '~~/shared/auth'
import { getTenantId, requireFlag } from '~~/server/utils/tenant'
import { FEATURE_FLAGS } from '~~/shared/feature-flags'
import { buildCenForEmployee } from '~~/server/services/cen.service'
import { signCenWithCompany } from '~~/server/services/cen-signature.service'
import {
  buildDianZipName,
  buildSendNominaSyncEnvelope,
  DIAN_ENDPOINTS,
  parseSendNominaSyncResponse,
  sendSoapRequest,
} from '~~/server/services/dian-transport.service'
import { logAudit } from '~~/server/utils/audit'
import { decryptDianSecret, loadP12Certificate } from '~~/server/utils/dian-crypto'

/**
 * Transmite el DSNE (firmado) al VPFE de la DIAN mediante SendNominaSync.
 *
 * - `?employeeId=...` transmite un solo empleado; sin él, transmite todos.
 * - `?dryRun=true` construye el sobre SOAP y lo devuelve sin enviar (útil
 *   para validar el mensaje antes de tener credenciales de habilitación).
 *
 * Requiere el certificado .p12 configurado en la empresa (firma XAdES-EPES).
 */
export default defineEventHandler(async (event) => {
  const { userId } = await requireFlag(
    event,
    [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR],
    FEATURE_FLAGS.PAYROLL,
  )

  const tenantId = await getTenantId(event)
  const id = String(getRouterParam(event, 'id') ?? '')
  const query = getQuery(event)
  const employeeId = query.employeeId ? String(query.employeeId) : ''
  const dryRun = query.dryRun === 'true'

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
  if (!company.cenCertificateP12) {
    throw createError({
      statusCode: 400,
      message:
        'Para transmitir a la DIAN necesitas cargar el certificado digital (.p12) en Configuración → Empresa.',
    })
  }

  const secret = String(useRuntimeConfig(event).dianCertSecret || '')
  const certificate = loadP12Certificate(
    decryptDianSecret(company.cenCertificateP12, secret),
    decryptDianSecret(company.cenCertificatePassword ?? '', secret),
  )
  const environment = (company.cenEnvironment ?? 2) as 1 | 2
  const endpointUrl = DIAN_ENDPOINTS[environment]

  const entries = employeeId
    ? (payroll.employees ?? []).filter(
        (entry) => String(entry.employee) === employeeId,
      )
    : (payroll.employees ?? [])
  if (entries.length === 0) {
    throw createError({
      statusCode: 400,
      message: employeeId
        ? 'El empleado no está en esta nómina.'
        : 'La nómina no tiene empleados para transmitir.',
    })
  }

  const employeeDocs = await Employee.find({
    _id: { $in: entries.map((entry) => entry.employee) },
  }).lean()
  const employeesById = new Map(
    employeeDocs.map((employee) => [String(employee._id), employee]),
  )

  const results: Array<{
    employeeId: string
    employeeName: string
    fileName?: string
    envelope?: string
    isValid?: boolean
    statusCode?: string
    statusDescription?: string
    statusMessage?: string
    errors?: string[]
    xmlDocumentKey?: string
    error?: string
  }> = []

  const transmissions: Array<Record<string, unknown>> = []

  for (const entry of entries) {
    const employee = employeesById.get(String(entry.employee))
    const employeeName = employee
      ? `${employee.firstName} ${employee.lastName}`
      : String(entry.employee)
    const base = {
      employeeId: String(entry.employee),
      employeeName,
    }
    try {
      if (!employee) throw new Error('Ficha de empleado no encontrada')
      const { xml, filename } = await buildCenForEmployee({
        payroll,
        company,
        employee,
        entry,
      })
      const { xml: signedXml } = signCenWithCompany(xml, company)
      const zipName = buildDianZipName(
        company.nit,
        Number(filename.match(/_(\d+)\.xml$/)?.[1] ?? 0),
      )

      const chunks: Buffer[] = []
      const archive = archiver('zip', { zlib: { level: 9 } })
      archive.on('data', (chunk: Buffer) => chunks.push(chunk))
      const finished = new Promise<void>((resolve, reject) => {
        archive.on('end', () => resolve())
        archive.on('error', (error) => reject(error))
      })
      archive.append(signedXml, { name: filename })
      await archive.finalize()
      await finished
      const zipBase64 = Buffer.concat(chunks).toString('base64')

      const { envelope, action } = buildSendNominaSyncEnvelope(
        zipBase64,
        certificate,
        { endpointUrl },
      )

      if (dryRun) {
        results.push({ ...base, fileName: zipName, envelope })
        transmissions.push({
          employee: entry.employee,
          fileName: zipName,
          environment,
          statusCode: 'DRY_RUN',
          statusDescription: 'Sobre SOAP construido sin enviar',
          transmittedBy: userId,
        })
        continue
      }

      const soapResponse = await sendSoapRequest(envelope, {
        endpointUrl,
        action,
        certificate,
      })
      const parsed = parseSendNominaSyncResponse(soapResponse)
      results.push({ ...base, fileName: zipName, ...parsed })
      transmissions.push({
        employee: entry.employee,
        fileName: zipName,
        environment,
        isValid: parsed.isValid,
        statusCode: parsed.statusCode,
        statusDescription: parsed.statusDescription,
        statusMessage: parsed.statusMessage,
        errorMessages: parsed.errors,
        xmlDocumentKey: parsed.xmlDocumentKey,
        transmittedBy: userId,
      })
    } catch (err) {
      const message =
        (err as { message?: string })?.message ?? 'Error al transmitir el CEN'
      results.push({ ...base, error: message })
    }
  }

  if (transmissions.length > 0 && !dryRun) {
    payroll.dianTransmissions = [
      ...(payroll.dianTransmissions ?? []),
      ...transmissions,
    ] as never
    await payroll.save()
  }

  const session = await getUserSession(event)
  const userName = (session.user as { name?: string } | undefined)?.name ?? ''
  await logAudit({
    module: 'payroll',
    action: dryRun ? 'generate' : 'pay',
    entityId: String(payroll._id),
    userId,
    userName,
    description: dryRun
      ? `Vista previa SOAP SendNominaSync (${results.length} empleado(s))`
      : `Transmisión al VPFE ${environment === 1 ? 'producción' : 'habilitación'} (${results.length} empleado(s))`,
    changes: { employeeCount: results.length, dryRun },
  })

  return { environment, endpointUrl, dryRun, results }
})
