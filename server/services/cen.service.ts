/**
 * Documento Soporte de Pago de Nómina Electrónica (DSNE) — estructura DIAN.
 *
 * Fase M2/M3: estructura oficial `NominaIndividual` (TipoXML 102), dígito de
 * verificación del NIT (módulo 11 DIAN), numeración correlativa anual, CUNE
 * (SHA-384), SoftwareSC y código QR del DSNE.
 *
 * La firma XAdES-EPES (M4, Resolución 000013 de 2021) se aplica en
 * `server/services/cen-signature.service.ts` cuando la empresa tiene un
 * certificado .p12 configurado. El XSD oficial (V1.0.6) y los esquemas UBL
 * asociados están versionados en `server/assets/dian/` y el XML generado
 * valida contra ellos (ver README de esa carpeta).
 */

import { Company } from '~~/server/models/Company'
import {
  PAYROLL_FREQUENCIES,
  type PayrollFrequency,
} from '~~/shared/payroll-period'
import {
  computeCune,
  computeSoftwareSC,
} from '~~/server/utils/cune'

const DAY_MS = 24 * 60 * 60 * 1000

/** Códigos DIAN de TipoContrato (tabla 5.5.2 del anexo técnico). */
const CONTRACT_TYPE_CODES: Record<string, number> = {
  indefinite: 2,
  fixed: 1,
  work_labor: 3,
  intern: 4,
}

export const escapeXml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const money = (value?: number): string =>
  (Math.round((value ?? 0) * 100) / 100).toFixed(2)

const attr = (name: string, value: unknown): string =>
  `${name}="${escapeXml(value)}"`

/** Pesos del módulo 11 DIAN (Resolución 4 de 1989), de derecha a izquierda. */
const NIT_DV_WEIGHTS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71]

/**
 * Dígito de verificación del NIT (módulo 11 DIAN).
 * Ejemplos reales: 860069804 → 2, 891701664 → 1.
 */
export const computeNitDv = (nit: string): number => {
  const digits = nit.replace(/\D/g, '').split('').reverse()
  const sum = digits.reduce(
    (acc, digit, index) =>
      acc + Number(digit) * NIT_DV_WEIGHTS[index % NIT_DV_WEIGHTS.length],
    0,
  )
  const mod = sum % 11
  return mod > 1 ? 11 - mod : mod
}

const splitWords = (value: string): [string, string] => {
  const parts = String(value ?? '').trim().split(/\s+/).filter(Boolean)
  return [parts[0] ?? '', parts.slice(1).join(' ')]
}

export interface ICenPayload {
  /** Consecutivo anual asignado por el empleador (empresa). */
  sequence: number
  /** Prefijo opcional de la numeración (p. ej. "SME"). */
  prefix?: string
  /** Fecha de generación del documento (YYYY-MM-DD). */
  generationDate: string
  /** Hora de generación con zona horaria (HH:mm:ss-05:00). */
  generationTime: string
  company: {
    name: string
    nit: string
    address?: string
    /** Código DIVIPOLA (5 dígitos) del municipio del domicilio principal. */
    municipalityCode: string
    /** DV del NIT; si no se envía se calcula con módulo 11. */
    dv?: number
  }
  employee: {
    document: string
    /** Código DIAN del tipo de documento (tabla 5.2.1); por defecto 13 = CC. */
    documentType?: number
    /** Código DIAN TipoTrabajador (tabla 5.5.3); por defecto 01 = dependiente. */
    employeeType?: string
    /** Código DIAN SubTipoTrabajador (tabla 5.5.4); por defecto 00 = no aplica. */
    subEmployeeType?: string
    /** Contrato con salario integral (SalarioIntegral). */
    salarioIntegral?: boolean
    /** Entidad bancaria para el pago de nómina (Pago/@Banco). */
    bankName?: string
    /** Tipo de cuenta bancaria: ahorros o corriente (Pago/@TipoCuenta). */
    accountType?: string
    /** Número de cuenta bancaria (Pago/@NumeroCuenta). */
    accountNumber?: string
    firstName: string
    lastName: string
    /** Fecha de ingreso (YYYY-MM-DD), para el tiempo laborado. */
    hireDate?: string
    /** Código DIAN TipoContrato (tabla 5.5.2): 1 fijo, 2 indefinido, 3 obra, 4 aprendizaje, 5 prácticas. */
    contractTypeCode?: number
    baseSalary: number
  }
  /** Identificador del software registrado ante la DIAN (obligatorio en producción; M3). */
  softwareId?: string
  /** Código de seguridad del software ante la DIAN (obligatorio en producción; M3). */
  softwareSC?: string
  /** PIN del software asignado al activarlo ante la DIAN (privado, para CUNE/SC). */
  softwarePin?: string
  /** Ambiente de destino (tabla 5.1.1): 1 producción, 2 pruebas. Default: 2. */
  environment?: 1 | 2
  /** Código DIAN PeriodoNomina (tabla 5.5.1): 1 semanal … 5 mensual, 6 otro. */
  payrollFrequencyCode?: number
  /** Código DIAN Metodo de pago (tabla 5.3.3.2). Default: 42 = consignación bancaria. */
  paymentMethod?: number
  /** Conceptos del catálogo aplicados en el período (mapeo a bloques DIAN). */
  conceptos?: Array<{
    type: 'devengo' | 'deduccion'
    dianBlock: string
    value: number
  }>
  period: { start: string; end: string }
  daysWorked: number
  /** Tiempo total laborado (días) hasta el fin del período. */
  tiempoLaborado: number
  devengados: {
    baseSalary: number
    transportAllowance: number
    overtimeDay: number
    overtimeNight: number
    nightSurcharge: number
    /** Horas de extra diurna (Cantidad del bloque HEDs). */
    overtimeDayHours?: number
    /** Horas de extra nocturna (Cantidad del bloque HENs). */
    overtimeNightHours?: number
    /** Horas con recargo nocturno (Cantidad del bloque HRNs). */
    nightSurchargeHours?: number
    bonuses: number
    commissions: number
    absenceCompanyPaidValue?: number
    absenceEpsValue?: number
    absenceArlValue?: number
    /** Días de incapacidad común pagados por la empresa. */
    absenceCompanyPaidDays?: number
    /** Días de incapacidad común asumidos por la EPS. */
    absenceEpsDays?: number
    /** Días de incapacidad laboral asumidos por la ARL. */
    absenceArlDays?: number
    total: number
  }
  deducciones: {
    employeeHealth: number
    employeePension: number
    sourceRetention: number
    garnishments: number
    loans: number
    total: number
  }
  totalToPay: number
}

/**
 * Construye el XML del DSNE con la estructura oficial `NominaIndividual`.
 * Sin CUNE ni firma (M3/M4); incluye DV del NIT, municipio DIVIPOLA y
 * numeración correlativa anual.
 */
export const buildCenXml = (data: ICenPayload): string => {
  const { company, employee, period, devengados, deducciones } = data

  const municipality = company.municipalityCode?.trim() ?? ''
  if (!municipality) {
    throw new Error('Código de municipio (DIVIPOLA) no configurado en la empresa.')
  }
  if (!/^\d{5}$/.test(municipality)) {
    throw new Error('El código de municipio (DIVIPOLA) debe tener 5 dígitos.')
  }

  const dv = company.dv ?? computeNitDv(company.nit)
  const environment = data.environment ?? 2
  const paymentMethod = data.paymentMethod ?? 42
  const periodoNomina = data.payrollFrequencyCode ?? 5
  const conceptoTotal = (block: string) =>
    (data.conceptos ?? [])
      .filter((concept) => concept.dianBlock === block)
      .reduce((sum, concept) => sum + (concept.value || 0), 0)
  const department = municipality.slice(0, 2)
  const [primerApellido, segundoApellido] = splitWords(employee.lastName)
  const [primerNombre, otrosNombres] = splitWords(employee.firstName)
  const numero = data.prefix
    ? `${data.prefix}${data.sequence}`
    : String(data.sequence)
  const cune = data.softwarePin
    ? computeCune({
        numero,
        fechaGen: data.generationDate,
        horaGen: data.generationTime,
        totalDevengado: devengados.total,
        totalDeducciones: deducciones.total,
        totalPagado: data.totalToPay,
        nit: company.nit,
        documentoEmpleado: employee.document,
        tipoXml: 102,
        softwarePin: data.softwarePin,
        ambiente: environment,
      })
    : ''
  const softwareSC = computeSoftwareSC(
    data.softwareId ?? '',
    data.softwarePin ?? '',
    numero,
  )
  const qrUrl = cune
    ? `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${cune}`
    : ''
  const pagoXml = [
    `<Pago ${attr('Forma', '1')} ${attr('Metodo', paymentMethod)}`,
    employee.bankName ? ` ${attr('Banco', employee.bankName)}` : '',
    employee.accountType ? ` ${attr('TipoCuenta', employee.accountType)}` : '',
    employee.accountNumber
      ? ` ${attr('NumeroCuenta', employee.accountNumber)}`
      : '',
    ' />',
  ].join('')

  // Horas extras y recargos reconocidos por empleado (tabla 5.5.5 del anexo
  // técnico): HEDs = extra diurna 25%, HENs = extra nocturna 75%,
  // HRNs = recargo nocturno 35%.
  const horasExtras: Array<{
    container: string
    item: string
    cantidad: number
    porcentaje: number
    valor: number
  }> = []
  if (devengados.overtimeDay > 0) {
    horasExtras.push({
      container: 'HEDs',
      item: 'HED',
      cantidad: devengados.overtimeDayHours ?? 0,
      porcentaje: 25,
      valor: devengados.overtimeDay,
    })
  }
  if (devengados.overtimeNight > 0) {
    horasExtras.push({
      container: 'HENs',
      item: 'HEN',
      cantidad: devengados.overtimeNightHours ?? 0,
      porcentaje: 75,
      valor: devengados.overtimeNight,
    })
  }
  if (devengados.nightSurcharge > 0) {
    horasExtras.push({
      container: 'HRNs',
      item: 'HRN',
      cantidad: devengados.nightSurchargeHours ?? 0,
      porcentaje: 35,
      valor: devengados.nightSurcharge,
    })
  }

  // Incapacidades (tabla 5.5.6): 1 = común, 3 = laboral (ARL).
  const incapacidades: Array<{
    tipo: number
    cantidad: number
    valor: number
  }> = []
  if (devengados.absenceCompanyPaidValue) {
    incapacidades.push({
      tipo: 1,
      cantidad: devengados.absenceCompanyPaidDays ?? 0,
      valor: devengados.absenceCompanyPaidValue,
    })
  }
  if (devengados.absenceEpsValue) {
    incapacidades.push({
      tipo: 1,
      cantidad: devengados.absenceEpsDays ?? 0,
      valor: devengados.absenceEpsValue,
    })
  }
  if (devengados.absenceArlValue) {
    incapacidades.push({
      tipo: 3,
      cantidad: devengados.absenceArlDays ?? 0,
      valor: devengados.absenceArlValue,
    })
  }

  // Bonificaciones S/NS y comisiones: suma de los conceptos del catálogo
  // y de los ajustes manuales de la nómina.
  const bonificacionS =
    (devengados.bonuses ?? 0) + conceptoTotal('bonificacion_salarial')
  const bonificacionNS = conceptoTotal('bonificacion_no_salarial')
  const comisionTotal =
    (devengados.commissions ?? 0) + conceptoTotal('comision')

  const horasExtrasXml = horasExtras
    .map(
      (he) =>
        `<${he.container}>\n      <${he.item} ${attr('Cantidad', he.cantidad)} ${attr('Porcentaje', `${he.porcentaje}.00`)} ${attr('Pago', money(he.valor))} />\n    </${he.container}>`,
    )
    .join('\n    ')

  const devengadosXml = [
    `<Basico ${attr('DiasTrabajados', data.daysWorked)} ${attr('SueldoTrabajado', money(devengados.baseSalary))} />`,
    devengados.transportAllowance > 0
      ? `<Transporte ${attr('AuxilioTransporte', money(devengados.transportAllowance))} />`
      : '',
    horasExtrasXml,
    incapacidades.length > 0
      ? `<Incapacidades>\n${incapacidades
          .map(
            (inc) =>
              `      <Incapacidad ${attr('Cantidad', inc.cantidad)} ${attr('Tipo', inc.tipo)} ${attr('Pago', money(inc.valor))} />`,
          )
          .join('\n')}\n    </Incapacidades>`
      : '',
    bonificacionS > 0 || bonificacionNS > 0
      ? `<Bonificaciones>${bonificacionS > 0 ? `\n      <Bonificacion ${attr('BonificacionS', money(bonificacionS))} />` : ''}${bonificacionNS > 0 ? `\n      <Bonificacion ${attr('BonificacionNS', money(bonificacionNS))} />` : ''}\n    </Bonificaciones>`
      : '',
    comisionTotal > 0
      ? `<Comisiones>\n      <Comision>${money(comisionTotal)}</Comision>\n    </Comisiones>`
      : '',
  ]
    .filter(Boolean)
    .join('\n    ')

  const afcTotal = conceptoTotal('afc')
  const cooperativaTotal = conceptoTotal('cooperativa')
  const planComplementarioTotal = conceptoTotal('plan_complementario')
  const educacionTotal = conceptoTotal('educacion')
  const reintegroTotal = conceptoTotal('reintegro')
  const embargoTotal =
    (deducciones.garnishments ?? 0) + conceptoTotal('embargo')
  const deudaTotal = (deducciones.loans ?? 0) + conceptoTotal('deuda')

  const deduccionesXml = [
    `<Salud ${attr('Porcentaje', '4.00')} ${attr('Deduccion', money(deducciones.employeeHealth))} />`,
    `<FondoPension ${attr('Porcentaje', '4.00')} ${attr('Deduccion', money(deducciones.employeePension))} />`,
    deducciones.sourceRetention > 0
      ? `<RetencionFuente>${money(deducciones.sourceRetention)}</RetencionFuente>`
      : '',
    afcTotal > 0 ? `<AFC>${money(afcTotal)}</AFC>` : '',
    cooperativaTotal > 0
      ? `<Cooperativa>${money(cooperativaTotal)}</Cooperativa>`
      : '',
    embargoTotal > 0
      ? `<EmbargoFiscal>${money(embargoTotal)}</EmbargoFiscal>`
      : '',
    planComplementarioTotal > 0
      ? `<PlanComplementarios>${money(planComplementarioTotal)}</PlanComplementarios>`
      : '',
    educacionTotal > 0
      ? `<Educacion>${money(educacionTotal)}</Educacion>`
      : '',
    reintegroTotal > 0
      ? `<Reintegro>${money(reintegroTotal)}</Reintegro>`
      : '',
    deudaTotal > 0
      ? `<Deuda>${money(deudaTotal)}</Deuda>`
      : '',
  ]
    .filter(Boolean)
    .join('\n    ')

  return `<?xml version="1.0" encoding="UTF-8"?>
<NominaIndividual xmlns="dian:gov:co:facturaelectronica:NominaIndividual" xmlns:xs="http://www.w3.org/2001/XMLSchema-instance" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2" xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" xmlns:xades141="http://uri.etsi.org/01903/v1.4.1#" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" SchemaLocation="" xsi:schemaLocation="dian:gov:co:facturaelectronica:NominaIndividual NominaIndividualElectronicaXSD.xsd">
  <Novedad CUNENov="">false</Novedad>
  <Periodo ${attr('FechaIngreso', employee.hireDate ?? period.start)} ${attr('FechaLiquidacionInicio', period.start)} ${attr('FechaLiquidacionFin', period.end)} ${attr('TiempoLaborado', data.tiempoLaborado)} ${attr('FechaGen', data.generationDate)} />
  <NumeroSecuenciaXML ${attr('CodigoTrabajador', employee.document)}${data.prefix ? ` ${attr('Prefijo', data.prefix)}` : ''} ${attr('Consecutivo', data.sequence)} ${attr('Numero', numero)} />
  <LugarGeneracionXML ${attr('Pais', 'CO')} ${attr('DepartamentoEstado', department)} ${attr('MunicipioCiudad', municipality)} ${attr('Idioma', 'es')} />
  <ProveedorXML ${attr('NIT', company.nit)} ${attr('DV', dv)} ${attr('SoftwareID', data.softwareId ?? '')} ${attr('SoftwareSC', softwareSC)} />
  <CodigoQR>${qrUrl}</CodigoQR>
  <InformacionGeneral ${attr('Version', 'V1.0: Documento Soporte de Pago de Nómina Electrónica')} ${attr('Ambiente', environment)} ${attr('TipoXML', '102')} ${attr('CUNE', cune)} ${attr('EncripCUNE', 'CUNE-SHA384')} ${attr('FechaGen', data.generationDate)} ${attr('HoraGen', data.generationTime)} ${attr('PeriodoNomina', periodoNomina)} ${attr('TipoMoneda', 'COP')} ${attr('TRM', '0')} />
  <Empleador ${attr('RazonSocial', company.name)} ${attr('NIT', company.nit)} ${attr('DV', dv)} ${attr('Pais', 'CO')} ${attr('DepartamentoEstado', department)} ${attr('MunicipioCiudad', municipality)} ${attr('Direccion', company.address ?? '')} />
  <Trabajador ${attr('TipoTrabajador', employee.employeeType ?? '01')} ${attr('SubTipoTrabajador', employee.subEmployeeType ?? '00')} ${attr('AltoRiesgoPension', 'false')} ${attr('TipoDocumento', employee.documentType ?? 13)} ${attr('NumeroDocumento', employee.document)} ${attr('PrimerApellido', primerApellido)}${segundoApellido ? ` ${attr('SegundoApellido', segundoApellido)}` : ''} ${attr('PrimerNombre', primerNombre)}${otrosNombres ? ` ${attr('OtrosNombres', otrosNombres)}` : ''} ${attr('LugarTrabajoPais', 'CO')} ${attr('LugarTrabajoDepartamentoEstado', department)} ${attr('LugarTrabajoMunicipioCiudad', municipality)} ${attr('LugarTrabajoDireccion', company.address ?? '')} ${attr('SalarioIntegral', employee.salarioIntegral ?? false)} ${attr('TipoContrato', employee.contractTypeCode ?? 2)} ${attr('Sueldo', money(employee.baseSalary))} ${attr('CodigoTrabajador', employee.document)} />
  ${pagoXml}
  <FechasPagos>
    <FechaPago>${period.end}</FechaPago>
  </FechasPagos>
  <Devengados>
    ${devengadosXml}
  </Devengados>
  <Deducciones>
    ${deduccionesXml}
  </Deducciones>
  <DevengadosTotal>${money(devengados.total)}</DevengadosTotal>
  <DeduccionesTotal>${money(deducciones.total)}</DeduccionesTotal>
  <ComprobanteTotal>${money(data.totalToPay)}</ComprobanteTotal>
</NominaIndividual>`
}

export interface ICenEmployeeSource {
  payroll: {
    periodStart: Date
    periodEnd: Date
    periodoNomina?: number
  }
  company: {
    _id: unknown
    name: string
    nit: string
    address?: string
    municipalityCode?: string
    cenEnvironment?: number
    softwareId?: string
    softwareSC?: string
    softwarePin?: string
    payrollFrequency?: string
    paymentMethod?: number
  }
  employee: {
    _id: unknown
    firstName: string
    lastName: string
    document: string
    documentType?: number
    employeeType?: string
    subEmployeeType?: string
    salarioIntegral?: boolean
    bankName?: string
    accountType?: string
    accountNumber?: string
    hireDate?: Date | string | null
    contractType?: string
    baseSalary?: number
  }
  entry: {
    devengados?: {
      daysWorked?: number
      baseSalary?: number
      transportAllowance?: number
      overtimeDay?: number
      overtimeNight?: number
      nightSurcharge?: number
      overtimeDayHours?: number
      overtimeNightHours?: number
      nightSurchargeHours?: number
      bonuses?: number
      commissions?: number
      absenceCompanyPaidValue?: number
      absenceEpsValue?: number
      absenceArlValue?: number
      absenceCompanyPaidDays?: number
      absenceEpsDays?: number
      absenceArlDays?: number
      total?: number
    }
    deducciones?: {
      employeeHealth?: number
      employeePension?: number
      sourceRetention?: number
      garnishments?: number
      loans?: number
      total?: number
    }
    conceptos?: Array<{
      type?: string
      dianBlock?: string
      value?: number
    }>
    totalToPay?: number
  }
}

/**
 * Construye el DSNE de un empleado dentro de una nómina, con numeración
 * correlativa anual atómica, hora de Colombia y los datos maestros DIAN.
 * Usado por la descarga individual y por la masiva (ZIP).
 */
export const buildCenForEmployee = async (
  source: ICenEmployeeSource,
): Promise<{ xml: string; filename: string }> => {
  const { payroll, company, employee, entry } = source
  const nit = String(company.nit ?? '').replace(/\D/g, '')
  if (!/^\d{8,10}$/.test(nit)) {
    throw createError({
      statusCode: 400,
      message:
        'Configura el NIT de la empresa en Configuración → Empresa antes de generar el DSNE.',
    })
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

  // Numeración correlativa anual, atómica por empresa.
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
    ? String(new Date(employee.hireDate).toISOString().slice(0, 10))
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
    softwarePin: company.softwarePin || undefined,
    environment: (company.cenEnvironment ?? 2) as 1 | 2,
    payrollFrequencyCode:
      payroll.periodoNomina ||
      PAYROLL_FREQUENCIES[
        (company.payrollFrequency as PayrollFrequency) ?? 'mensual'
      ]?.dianCode ||
      5,
    paymentMethod: company.paymentMethod ?? 42,
    conceptos: (entry.conceptos ?? []).map((concept) => ({
      type: concept.type as 'devengo' | 'deduccion',
      dianBlock: concept.dianBlock ?? '',
      value: concept.value ?? 0,
    })),
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
      bankName: employee.bankName || undefined,
      accountType: employee.accountType || undefined,
      accountNumber: employee.accountNumber || undefined,
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
  return { xml, filename }
}
