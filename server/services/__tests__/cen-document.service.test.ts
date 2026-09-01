import { describe, expect, it, vi } from 'vitest'

vi.mock('~~/server/models/Company', () => ({
  Company: { findOneAndUpdate: vi.fn() },
}))

import { Company } from '~~/server/models/Company'
import { buildCenForEmployee } from '~~/server/services/cen.service'

const base = {
  payroll: {
    periodStart: new Date('2026-07-01T00:00:00Z'),
    periodEnd: new Date('2026-07-31T00:00:00Z'),
    periodoNomina: 5,
  },
  company: {
    _id: 'c1',
    name: 'A & B SAS',
    nit: '900123456',
    address: 'Cra 10 # 20-30',
    municipalityCode: '11001',
    cenEnvironment: 2,
    payrollFrequency: 'mensual',
    paymentMethod: 42,
  },
  employee: {
    _id: 'e1',
    firstName: 'Ana',
    lastName: 'Martínez',
    document: '1000000001',
    documentType: 13,
    employeeType: '01',
    subEmployeeType: '00',
    salarioIntegral: false,
    hireDate: new Date('2024-03-01T00:00:00Z'),
    contractType: 'indefinite',
    baseSalary: 4000000,
  },
  entry: {
    devengados: {
      baseSalary: 4000000,
      daysWorked: 23,
      total: 4000000,
    },
    deducciones: {
      employeeHealth: 160000,
      employeePension: 160000,
      total: 320000,
    },
    totalToPay: 3680000,
  },
}

describe('buildCenForEmployee', () => {
  it('genera el XML con la secuencia asignada y el nombre del archivo', async () => {
    const query = { lean: vi.fn() }
    ;(query.lean as ReturnType<typeof vi.fn>).mockResolvedValue({
      cenSequence: 7,
    })
    ;(Company.findOneAndUpdate as ReturnType<typeof vi.fn>).mockReturnValue(
      query,
    )

    const { xml, filename } = await buildCenForEmployee(base)

    expect(xml).toContain('Consecutivo="7"')
    expect(xml).toContain('<NominaIndividual')
    expect(xml).toContain('TipoXML="102"')
    expect(xml).toContain('PeriodoNomina="5"')
    expect(filename).toBe(
      'CEN_900123456_1000000001_2026-07-01_2026-07-31.xml',
    )
  })

  it('lanza 400 si la empresa no tiene código de municipio', async () => {
    await expect(
      buildCenForEmployee({
        ...base,
        company: { ...base.company, municipalityCode: '' },
      }),
    ).rejects.toMatchObject({ statusCode: 400 })
  })
})
