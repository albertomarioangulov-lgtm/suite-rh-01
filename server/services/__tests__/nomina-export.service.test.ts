import { describe, expect, it } from 'vitest'
import { buildNominaExportRows } from '~~/server/services/nomina-export.service'

const base = {
  payroll: {
    periodStart: new Date('2026-07-01T00:00:00Z'),
    periodEnd: new Date('2026-07-31T00:00:00Z'),
  },
  company: { name: 'A & B SAS', nit: '900123456' },
  employees: [
    {
      _id: 'e1',
      firstName: 'Ana',
      lastName: 'Martínez',
      document: '1000000001',
      documentType: 13,
      employeeType: '01',
      subEmployeeType: '00',
      salarioIntegral: false,
      contractType: 'indefinite',
      hireDate: new Date('2024-03-01T00:00:00Z'),
    },
  ],
  entries: [
    {
      employee: 'e1',
      devengados: {
        daysWorked: 23,
        baseSalary: 4000000,
        transportAllowance: 249095,
        overtimeDay: 50000,
        overtimeNight: 75000,
        overtimeDayHours: 2,
        overtimeNightHours: 2,
        bonuses: 100000,
        commissions: 200000,
        total: 4674095,
      },
      deducciones: {
        employeeHealth: 160000,
        employeePension: 160000,
        sourceRetention: 80000,
        garnishments: 100000,
        loans: 50000,
        total: 550000,
      },
      conceptos: [
        { dianBlock: 'bonificacion_salarial', value: 50000 },
        { dianBlock: 'bonificacion_no_salarial', value: 30000 },
        { dianBlock: 'afc', value: 20000 },
        { dianBlock: 'cooperativa', value: 15000 },
      ],
      totalToPay: 4124095,
    },
    { employee: 'inexistente', devengados: { total: 0 } },
  ],
}

describe('buildNominaExportRows', () => {
  it('arma una fila por empleado con los totales y sumas de conceptos', () => {
    const rows = buildNominaExportRows(base)

    expect(rows).toHaveLength(1)
    const row = rows[0]
    expect(row.Empresa).toBe('A & B SAS')
    expect(row['Tipo documento']).toBe('Cédula de ciudadanía')
    expect(row['Tipo trabajador']).toBe('Dependiente')
    expect(row['Tipo contrato']).toBe('Término indefinido')
    expect(row['Bonificación salarial']).toBe(150000)
    expect(row['Bonificación no salarial']).toBe(30000)
    expect(row.Comisiones).toBe(200000)
    expect(row.AFC).toBe(20000)
    expect(row.Cooperativa).toBe(15000)
    expect(row['Embargo (orden judicial)']).toBe(100000)
    expect(row['Préstamo (deuda)']).toBe(50000)
    expect(row['Total devengado']).toBe(4674095)
    expect(row['Total deducciones']).toBe(550000)
    expect(row['Neto a pagar']).toBe(4124095)
  })
})
