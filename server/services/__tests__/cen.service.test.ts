import { describe, expect, it } from 'vitest'
import { buildCenXml, escapeXml } from '~~/server/services/cen.service'

const payload = {
  sequence: 3,
  company: { name: 'A & B SAS', nit: '900123456', address: 'Cra 10 # 20-30' },
  employee: {
    document: '1000000001',
    firstName: 'Ana',
    lastName: 'Martínez',
    position: 'Contadora',
  },
  period: { start: '2026-07-01', end: '2026-07-31' },
  daysWorked: 23,
  devengados: {
    baseSalary: 4000000,
    transportAllowance: 249095,
    overtimeDay: 50000,
    overtimeNight: 75000,
    nightSurcharge: 0,
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
  seguridadSocial: {
    employerHealth: 340000,
    employerPension: 480000,
    arl: 69600,
    sena: 80000,
    icbf: 120000,
    compensationFund: 160000,
    total: 1249600,
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

describe('buildCenXml', () => {
  it('incluye encabezado XML y raíz CEN', () => {
    const xml = buildCenXml(payload)
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml).toContain('<cencos:CEN')
    expect(xml).toContain('</cencos:CEN>')
  })

  it('incluye secuencia, empleador, trabajador y período', () => {
    const xml = buildCenXml(payload)
    expect(xml).toContain('<cencos:NumeroSecuencia>3</cencos:NumeroSecuencia>')
    expect(xml).toContain('<cencos:NIT>900123456</cencos:NIT>')
    expect(xml).toContain(
      '<cencos:NumeroDocumento>1000000001</cencos:NumeroDocumento>',
    )
    expect(xml).toContain('<cencos:FechaInicio>2026-07-01</cencos:FechaInicio>')
    expect(xml).toContain('<cencos:FechaFin>2026-07-31</cencos:FechaFin>')
  })

  it('incluye totales de devengado, deducciones, seguridad social y neto', () => {
    const xml = buildCenXml(payload)
    expect(xml).toContain('<cencos:TotalDevengado>4374095</cencos:TotalDevengado>')
    expect(xml).toContain('<cencos:TotalDeduccion>450000</cencos:TotalDeduccion>')
    expect(xml).toContain(
      '<cencos:TotalSeguridadSocial>1249600</cencos:TotalSeguridadSocial>',
    )
    expect(xml).toContain('<cencos:NetoAPagar>3924095</cencos:NetoAPagar>')
  })

  it('escapa la razón social en el XML', () => {
    const xml = buildCenXml(payload)
    expect(xml).toContain('<cencos:RazonSocial>A &amp; B SAS</cencos:RazonSocial>')
    expect(xml).not.toContain('<cencos:RazonSocial>A & B SAS</cencos:RazonSocial>')
  })
})
