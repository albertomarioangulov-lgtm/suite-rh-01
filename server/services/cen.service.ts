/**
 * Generación del Comprobante de Nómina Electrónica (CEN) — versión inicial.
 *
 * NOTA: esta versión genera un XML con la estructura documentada del CEN
 * para descarga/inspección. Aún NO valida contra el XSD oficial de la DIAN,
 * ni firma digitalmente. La validación oficial (M2) requiere el XSD
 * publicado por la DIAN y la verificación campo por campo.
 */

export const escapeXml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const money = (value?: number) =>
  String(Math.round((value ?? 0) * 100) / 100)

export interface ICenPayload {
  sequence: number
  company: { name: string; nit: string; address?: string }
  employee: {
    document: string
    firstName: string
    lastName: string
    position?: string
  }
  period: { start: string; end: string }
  daysWorked: number
  devengados: {
    baseSalary: number
    transportAllowance: number
    overtimeDay: number
    overtimeNight: number
    nightSurcharge: number
    bonuses: number
    commissions: number
    absenceCompanyPaidValue?: number
    absenceEpsValue?: number
    absenceArlValue?: number
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
  seguridadSocial: {
    employerHealth: number
    employerPension: number
    arl: number
    sena: number
    icbf: number
    compensationFund: number
    total: number
  }
  totalToPay: number
}

/** Construye el XML del CEN (estructura inicial, sin firma). */
export const buildCenXml = (data: ICenPayload): string => {
  const { company, employee, period, devengados, deducciones, seguridadSocial } =
    data
  return `<?xml version="1.0" encoding="UTF-8"?>
<cencos:CEN xmlns:cencos="dian:gov:co:facturaelectronica:CEN" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="1.0">
  <cencos:NumeroSecuencia>${data.sequence}</cencos:NumeroSecuencia>
  <cencos:FechaGeneracion>${period.end}</cencos:FechaGeneracion>
  <cencos:Empleador>
    <cencos:RazonSocial>${escapeXml(company.name)}</cencos:RazonSocial>
    <cencos:NIT>${escapeXml(company.nit)}</cencos:NIT>
    <cencos:DV>0</cencos:DV>
    ${company.address ? `<cencos:Direccion>${escapeXml(company.address)}</cencos:Direccion>` : ''}
  </cencos:Empleador>
  <cencos:Trabajador>
    <cencos:TipoDocumento>CC</cencos:TipoDocumento>
    <cencos:NumeroDocumento>${escapeXml(employee.document)}</cencos:NumeroDocumento>
    <cencos:PrimerApellido>${escapeXml(employee.lastName)}</cencos:PrimerApellido>
    <cencos:PrimerNombre>${escapeXml(employee.firstName)}</cencos:PrimerNombre>
    ${employee.position ? `<cencos:Cargo>${escapeXml(employee.position)}</cencos:Cargo>` : ''}
  </cencos:Trabajador>
  <cencos:Periodo>
    <cencos:FechaInicio>${period.start}</cencos:FechaInicio>
    <cencos:FechaFin>${period.end}</cencos:FechaFin>
    <cencos:NumeroDiasTrabajados>${data.daysWorked}</cencos:NumeroDiasTrabajados>
  </cencos:Periodo>
  <cencos:TipoMoneda>COP</cencos:TipoMoneda>
  <cencos:Devengados>
    <cencos:Salario>${money(devengados.baseSalary)}</cencos:Salario>
    <cencos:AuxilioTransporte>${money(devengados.transportAllowance)}</cencos:AuxilioTransporte>
    <cencos:HorasExtrasDiurnas>${money(devengados.overtimeDay)}</cencos:HorasExtrasDiurnas>
    <cencos:HorasExtrasNocturnas>${money(devengados.overtimeNight)}</cencos:HorasExtrasNocturnas>
    <cencos:RecargoNocturno>${money(devengados.nightSurcharge)}</cencos:RecargoNocturno>
    <cencos:Bonificaciones>${money(devengados.bonuses)}</cencos:Bonificaciones>
    <cencos:Comisiones>${money(devengados.commissions)}</cencos:Comisiones>
    <cencos:IncapacidadEmpresa>${money(devengados.absenceCompanyPaidValue)}</cencos:IncapacidadEmpresa>
    <cencos:IncapacidadEPS>${money(devengados.absenceEpsValue)}</cencos:IncapacidadEPS>
    <cencos:IncapacidadARL>${money(devengados.absenceArlValue)}</cencos:IncapacidadARL>
    <cencos:TotalDevengado>${money(devengados.total)}</cencos:TotalDevengado>
  </cencos:Devengados>
  <cencos:Deducciones>
    <cencos:Salud>${money(deducciones.employeeHealth)}</cencos:Salud>
    <cencos:Pension>${money(deducciones.employeePension)}</cencos:Pension>
    <cencos:RetencionFuente>${money(deducciones.sourceRetention)}</cencos:RetencionFuente>
    <cencos:EmbargoJudicial>${money(deducciones.garnishments)}</cencos:EmbargoJudicial>
    <cencos:DeudaPrestamo>${money(deducciones.loans)}</cencos:DeudaPrestamo>
    <cencos:TotalDeduccion>${money(deducciones.total)}</cencos:TotalDeduccion>
  </cencos:Deducciones>
  <cencos:SeguridadSocial>
    <cencos:SaludEmpleador>${money(seguridadSocial.employerHealth)}</cencos:SaludEmpleador>
    <cencos:PensionEmpleador>${money(seguridadSocial.employerPension)}</cencos:PensionEmpleador>
    <cencos:ARLEmpleador>${money(seguridadSocial.arl)}</cencos:ARLEmpleador>
    <cencos:SENA>${money(seguridadSocial.sena)}</cencos:SENA>
    <cencos:ICBF>${money(seguridadSocial.icbf)}</cencos:ICBF>
    <cencos:CajaCompensacion>${money(seguridadSocial.compensationFund)}</cencos:CajaCompensacion>
    <cencos:TotalSeguridadSocial>${money(seguridadSocial.total)}</cencos:TotalSeguridadSocial>
  </cencos:SeguridadSocial>
  <cencos:NetoAPagar>${money(data.totalToPay)}</cencos:NetoAPagar>
</cencos:CEN>`
}
