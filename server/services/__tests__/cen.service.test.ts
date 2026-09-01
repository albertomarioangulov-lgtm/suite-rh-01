import { describe, expect, it } from 'vitest'
import {
  buildCenXml,
  computeNitDv,
  escapeXml,
} from '~~/server/services/cen.service'

const payload = {
  sequence: 3,
  generationDate: '2026-08-09',
  generationTime: '18:15:00-05:00',
  company: {
    name: 'A & B SAS',
    nit: '900123456',
    address: 'Cra 10 # 20-30',
    municipalityCode: '11001',
  },
  employee: {
    document: '1000000001',
    documentType: 13,
    firstName: 'Ana María',
    lastName: 'Martínez Ruiz',
    bankName: 'Banco Andino',
    accountType: 'ahorros',
    accountNumber: '1234567890',
    hireDate: '2024-03-01',
    contractTypeCode: 1,
    baseSalary: 4000000,
  },
  period: { start: '2026-07-01', end: '2026-07-31' },
  daysWorked: 23,
  tiempoLaborado: 885,
  devengados: {
    baseSalary: 4000000,
    transportAllowance: 249095,
    overtimeDay: 50000,
    overtimeNight: 75000,
    nightSurcharge: 0,
    overtimeDayHours: 2,
    overtimeNightHours: 2,
    nightSurchargeHours: 0,
    bonuses: 0,
    commissions: 0,
    absenceCompanyPaidValue: 0,
    absenceEpsValue: 0,
    absenceArlValue: 0,
    total: 4374095,
  },
  deducciones: {
    employeeHealth: 160000,
    employeePension: 160000,
    sourceRetention: 80000,
    garnishments: 0,
    loans: 50000,
    total: 450000,
  },
  totalToPay: 3924095,
}

describe('escapeXml', () => {
  it('escapa caracteres especiales de XML', () => {
    expect(escapeXml(`A & B <C> "D" 'E'`)).toBe(
      'A &amp; B &lt;C&gt; &quot;D&quot; &apos;E&apos;',
    )
  })
})

describe('computeNitDv', () => {
  it('calcula el DV de NIT conocidos (módulo 11 DIAN)', () => {
    expect(computeNitDv('860069804')).toBe(2)
    expect(computeNitDv('891701664')).toBe(1)
    expect(computeNitDv('800197268')).toBe(4)
    expect(computeNitDv('900123456')).toBe(8)
  })

  it('ignora puntos, guiones y espacios al calcular el DV', () => {
    expect(computeNitDv('860.069.804')).toBe(2)
    expect(computeNitDv(' 891.701.664 ')).toBe(1)
  })
})

describe('buildCenXml', () => {
  it('usa la raíz oficial NominaIndividual con su namespace DIAN', () => {
    const xml = buildCenXml(payload)
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml).toContain(
      '<NominaIndividual xmlns="dian:gov:co:facturaelectronica:NominaIndividual"',
    )
    expect(xml).toContain('SchemaLocation=""')
    expect(xml).toContain('</NominaIndividual>')
    expect(xml).toContain('TipoXML="102"')
    expect(xml).toContain('EncripCUNE="CUNE-SHA384"')
    expect(xml).toContain('TipoMoneda="COP"')
    expect(xml).toContain('PeriodoNomina="5"')
    expect(xml).toContain('Ambiente="2"')
    expect(xml).toContain('Metodo="42"')
  })

  it('respeta la configuración DIAN de la empresa en el documento', () => {
    const xml = buildCenXml({
      ...payload,
      environment: 1,
      softwareId: 'SW-001',
      softwareSC: 'SC-ABC123',
      payrollFrequencyCode: 4,
      paymentMethod: 45,
    })
    expect(xml).toContain('PeriodoNomina="4"')
    expect(xml).toContain('Ambiente="1"')
    expect(xml).toContain('SoftwareID="SW-001"')
    expect(xml).toContain('SoftwareSC="SC-ABC123"')
    expect(xml).toContain('Metodo="45"')
  })

  it('incluye secuencia, período, empleador con DV y municipio', () => {
    const xml = buildCenXml(payload)
    expect(xml).toContain('Consecutivo="3"')
    expect(xml).toContain('Numero="3"')
    expect(xml).toContain('<Empleador')
    expect(xml).toContain('NIT="900123456"')
    expect(xml).toContain('DV="8"')
    expect(xml).toContain('MunicipioCiudad="11001"')
    expect(xml).toContain('DepartamentoEstado="11"')
    expect(xml).toContain('FechaLiquidacionInicio="2026-07-01"')
    expect(xml).toContain('FechaLiquidacionFin="2026-07-31"')
    expect(xml).toContain('TiempoLaborado="885"')
  })

  it('incluye ProveedorXML y CodigoQR antes de InformacionGeneral', () => {
    const xml = buildCenXml(payload)
    const proveedorIndex = xml.indexOf('<ProveedorXML')
    const codigoQrIndex = xml.indexOf('<CodigoQR></CodigoQR>')
    const informacionIndex = xml.indexOf('<InformacionGeneral')
    expect(proveedorIndex).toBeGreaterThan(-1)
    expect(codigoQrIndex).toBeGreaterThan(proveedorIndex)
    expect(informacionIndex).toBeGreaterThan(codigoQrIndex)
    expect(xml).toContain('SoftwareID=""')
    expect(xml).toContain('SoftwareSC=""')
  })

  it('divide apellidos y nombres en los campos del trabajador', () => {
    const xml = buildCenXml(payload)
    expect(xml).toContain('PrimerApellido="Martínez"')
    expect(xml).toContain('SegundoApellido="Ruiz"')
    expect(xml).toContain('PrimerNombre="Ana"')
    expect(xml).toContain('OtrosNombres="María"')
    expect(xml).toContain('NumeroDocumento="1000000001"')
    expect(xml).toContain('TipoDocumento="13"')
    expect(xml).toContain('Sueldo="4000000.00"')
  })

  it('incluye datos bancarios en Pago y campos DIAN del trabajador', () => {
    const xml = buildCenXml(payload)
    expect(xml).toContain(
      '<Pago Forma="1" Metodo="42" Banco="Banco Andino" TipoCuenta="ahorros" NumeroCuenta="1234567890" />',
    )
    expect(xml).toContain('TipoTrabajador="01"')
    expect(xml).toContain('SubTipoTrabajador="00"')
    expect(xml).toContain('SalarioIntegral="false"')
  })

  it('respeta tipo de trabajador y salario integral configurados', () => {
    const xml = buildCenXml({
      ...payload,
      employee: {
        ...payload.employee,
        employeeType: '02',
        salarioIntegral: true,
      },
    })
    expect(xml).toContain('TipoTrabajador="02"')
    expect(xml).toContain('SalarioIntegral="true"')
  })

  it('incluye devengados, horas extras y totales con dos decimales', () => {
    const xml = buildCenXml(payload)
    expect(xml).toContain('<Basico DiasTrabajados="23" SueldoTrabajado="4000000.00" />')
    expect(xml).toContain('<Transporte AuxilioTransporte="249095.00" />')
    expect(xml).toContain('<HEDs>')
    expect(xml).toContain('<HED Cantidad="2" Porcentaje="25.00" Pago="50000.00" />')
    expect(xml).toContain('<HENs>')
    expect(xml).toContain('<HEN Cantidad="2" Porcentaje="75.00" Pago="75000.00" />')
    expect(xml.indexOf('<HEDs>')).toBeLessThan(xml.indexOf('<HENs>'))
    expect(xml).toContain('<DevengadosTotal>4374095.00</DevengadosTotal>')
  })

  it('incluye deducciones y comprobante total', () => {
    const xml = buildCenXml(payload)
    expect(xml).toContain('<Salud Porcentaje="4.00" Deduccion="160000.00" />')
    expect(xml).toContain('<FondoPension Porcentaje="4.00" Deduccion="160000.00" />')
    expect(xml).toContain('<RetencionFuente>80000.00</RetencionFuente>')
    expect(xml).toContain('<Deuda>50000.00</Deuda>')
    expect(xml).toContain('<DeduccionesTotal>450000.00</DeduccionesTotal>')
    expect(xml).toContain('<ComprobanteTotal>3924095.00</ComprobanteTotal>')
  })

  it('estructura incapacidades, bonificaciones y comisiones en orden oficial', () => {
    const xml = buildCenXml({
      ...payload,
      devengados: {
        ...payload.devengados,
        absenceCompanyPaidValue: 180000,
        absenceEpsValue: 520000,
        absenceArlValue: 900000,
        absenceCompanyPaidDays: 2,
        absenceEpsDays: 4,
        absenceArlDays: 5,
        bonuses: 150000,
        commissions: 200000,
      },
    })
    expect(xml).toContain(
      '<Incapacidad Cantidad="2" Tipo="1" Pago="180000.00" />',
    )
    expect(xml).toContain(
      '<Incapacidad Cantidad="4" Tipo="1" Pago="520000.00" />',
    )
    expect(xml).toContain(
      '<Incapacidad Cantidad="5" Tipo="3" Pago="900000.00" />',
    )
    expect(xml).toContain(
      '<Bonificacion BonificacionS="150000.00" />',
    )
    expect(xml).toContain('<Comision>200000.00</Comision>')
    const order = ['<Basico ', '<Incapacidades>', '<Bonificaciones>', '<Comisiones>'].map(
      (token) => xml.indexOf(token),
    )
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })

  it('escapa la razón social en el XML', () => {
    const xml = buildCenXml(payload)
    expect(xml).toContain('RazonSocial="A &amp; B SAS"')
    expect(xml).not.toContain('RazonSocial="A & B SAS"')
  })

  it('lanza error si falta el código de municipio', () => {
    expect(() =>
      buildCenXml({
        ...payload,
        company: { ...payload.company, municipalityCode: '' },
      }),
    ).toThrow(/municipio/i)
  })
})
