import {
  CONTRACT_TYPE_DIAN_LABELS,
  DOCUMENT_TYPE_LABELS,
  EMPLOYEE_TYPE_LABELS,
  SUB_EMPLOYEE_TYPE_LABELS,
} from '~~/shared/dian-labels'

/** Códigos DIAN de TipoContrato (tabla 5.5.2 del anexo técnico). */
const CONTRACT_TYPE_CODES: Record<string, number> = {
  indefinite: 2,
  fixed: 1,
  work_labor: 3,
  intern: 4,
}

export interface INominaExportRow {
  Empresa: string
  NIT: string
  'Período inicio': string
  'Período fin': string
  Empleado: string
  'Tipo documento': string
  Documento: string
  'Tipo trabajador': string
  'Subtipo trabajador': string
  'Tipo contrato': string
  'Salario integral': 'Sí' | 'No'
  'Fecha ingreso': string
  'Días trabajados': number
  'Sueldo trabajado': number
  'Auxilio de transporte': number
  'Horas extra diurnas': number
  'Pago extra diurna': number
  'Horas extra nocturnas': number
  'Pago extra nocturna': number
  'Horas recargo nocturno': number
  'Pago recargo nocturno': number
  'Incapacidad común – días empresa': number
  'Incapacidad común – pago empresa': number
  'Incapacidad común – días EPS': number
  'Incapacidad común – pago EPS': number
  'Incapacidad laboral – días ARL': number
  'Incapacidad laboral – pago ARL': number
  'Bonificación salarial': number
  'Bonificación no salarial': number
  Comisiones: number
  'Salud empleado': number
  'Pensión empleado': number
  'Retención en la fuente': number
  AFC: number
  Cooperativa: number
  'Embargo (orden judicial)': number
  'Plan complementario': number
  Educación: number
  Reintegro: number
  'Préstamo (deuda)': number
  'Total devengado': number
  'Total deducciones': number
  'Neto a pagar': number
}

const dateOf = (value?: Date | string | null) =>
  value ? String(new Date(value).toISOString().slice(0, 10)) : ''

/**
 * Planilla de nómina electrónica: una fila por empleado con todos los
 * campos del DSNE ya calculados, para trasladar a la herramienta web
 * gratuita de la DIAN mientras el software no esté habilitado.
 */
export const buildNominaExportRows = (input: {
  payroll: { periodStart: Date; periodEnd: Date }
  company: { name: string; nit: string }
  employees: Array<{
    _id: unknown
    firstName: string
    lastName: string
    document: string
    documentType?: number
    employeeType?: string
    subEmployeeType?: string
    salarioIntegral?: boolean
    contractType?: string
    hireDate?: Date | string | null
  }>
  entries: Array<{
    employee: unknown
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
    conceptos?: Array<{ dianBlock?: string; value?: number }>
    totalToPay?: number
  }>
}): INominaExportRow[] => {
  const { payroll, company, employees, entries } = input
  const employeesById = new Map(
    employees.map((employee) => [String(employee._id), employee]),
  )

  const rows: INominaExportRow[] = []
  for (const entry of entries) {
    const employee = employeesById.get(String(entry.employee))
    if (!employee) continue

    const devengados = entry.devengados ?? {}
    const deducciones = entry.deducciones ?? {}
    const conceptos = entry.conceptos ?? []
    const conceptTotal = (block: string) =>
      conceptos
        .filter((concept) => concept.dianBlock === block)
        .reduce((sum, concept) => sum + (concept.value ?? 0), 0)

    const contractCode =
      CONTRACT_TYPE_CODES[employee.contractType ?? 'indefinite'] ?? 2

    rows.push({
      Empresa: company.name,
      NIT: company.nit,
      'Período inicio': dateOf(payroll.periodStart),
      'Período fin': dateOf(payroll.periodEnd),
      Empleado: `${employee.firstName} ${employee.lastName}`.trim(),
      'Tipo documento':
        DOCUMENT_TYPE_LABELS[employee.documentType ?? 13] ?? 'Cédula de ciudadanía',
      Documento: employee.document,
      'Tipo trabajador':
        EMPLOYEE_TYPE_LABELS[employee.employeeType ?? '01'] ?? 'Dependiente',
      'Subtipo trabajador':
        SUB_EMPLOYEE_TYPE_LABELS[employee.subEmployeeType ?? '00'] ?? 'No aplica',
      'Tipo contrato':
        CONTRACT_TYPE_DIAN_LABELS[contractCode] ?? String(contractCode),
      'Salario integral': employee.salarioIntegral ? 'Sí' : 'No',
      'Fecha ingreso': dateOf(employee.hireDate),
      'Días trabajados': devengados.daysWorked ?? 0,
      'Sueldo trabajado': devengados.baseSalary ?? 0,
      'Auxilio de transporte': devengados.transportAllowance ?? 0,
      'Horas extra diurnas': devengados.overtimeDayHours ?? 0,
      'Pago extra diurna': devengados.overtimeDay ?? 0,
      'Horas extra nocturnas': devengados.overtimeNightHours ?? 0,
      'Pago extra nocturna': devengados.overtimeNight ?? 0,
      'Horas recargo nocturno': devengados.nightSurchargeHours ?? 0,
      'Pago recargo nocturno': devengados.nightSurcharge ?? 0,
      'Incapacidad común – días empresa': devengados.absenceCompanyPaidDays ?? 0,
      'Incapacidad común – pago empresa':
        devengados.absenceCompanyPaidValue ?? 0,
      'Incapacidad común – días EPS': devengados.absenceEpsDays ?? 0,
      'Incapacidad común – pago EPS': devengados.absenceEpsValue ?? 0,
      'Incapacidad laboral – días ARL': devengados.absenceArlDays ?? 0,
      'Incapacidad laboral – pago ARL': devengados.absenceArlValue ?? 0,
      'Bonificación salarial':
        (devengados.bonuses ?? 0) + conceptTotal('bonificacion_salarial'),
      'Bonificación no salarial': conceptTotal('bonificacion_no_salarial'),
      Comisiones:
        (devengados.commissions ?? 0) + conceptTotal('comision'),
      'Salud empleado': deducciones.employeeHealth ?? 0,
      'Pensión empleado': deducciones.employeePension ?? 0,
      'Retención en la fuente': deducciones.sourceRetention ?? 0,
      AFC: conceptTotal('afc'),
      Cooperativa: conceptTotal('cooperativa'),
      'Embargo (orden judicial)':
        (deducciones.garnishments ?? 0) + conceptTotal('embargo'),
      'Plan complementario': conceptTotal('plan_complementario'),
      Educación: conceptTotal('educacion'),
      Reintegro: conceptTotal('reintegro'),
      'Préstamo (deuda)': (deducciones.loans ?? 0) + conceptTotal('deuda'),
      'Total devengado': devengados.total ?? 0,
      'Total deducciones': deducciones.total ?? 0,
      'Neto a pagar': entry.totalToPay ?? 0,
    })
  }

  return rows
}
