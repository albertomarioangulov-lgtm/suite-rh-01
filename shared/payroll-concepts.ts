/**
 * Catálogo de conceptos de nómina y su mapeo al DSNE (XSD oficial DIAN).
 * Cada concepto se emite en un bloque concreto del documento; los valores
 * se agregan al total del devengado o de las deducciones.
 */
export const PAYROLL_CONCEPT_BLOCK_VALUES = [
  'bonificacion_salarial',
  'bonificacion_no_salarial',
  'comision',
  'deuda',
  'embargo',
  'afc',
  'cooperativa',
  'plan_complementario',
  'educacion',
  'reintegro',
] as const

export type PayrollConceptDianBlock = (typeof PAYROLL_CONCEPT_BLOCK_VALUES)[number]

export const DIAN_CONCEPT_BLOCKS: Record<
  PayrollConceptDianBlock,
  { type: PayrollConceptType; label: string; description: string }
> = {
  bonificacion_salarial: {
    type: 'devengo',
    label: 'Bonificación salarial',
    description: 'Incentivo como contraprestación directa del servicio (BonificacionS).',
  },
  bonificacion_no_salarial: {
    type: 'devengo',
    label: 'Bonificación no salarial',
    description: 'Pago ocasional por mera liberalidad o pactado como no salarial (BonificacionNS).',
  },
  comision: {
    type: 'devengo',
    label: 'Comisión',
    description: 'Comisión por ventas o resultados del período.',
  },
  deuda: {
    type: 'deduccion',
    label: 'Deuda con la empresa',
    description: 'Crédito otorgado por la empresa o compensación por perjuicio.',
  },
  embargo: {
    type: 'deduccion',
    label: 'Embargo (orden judicial)',
    description: 'Embargo ordenado por autoridad judicial competente.',
  },
  afc: {
    type: 'deduccion',
    label: 'Aporte cuenta AFC',
    description: 'Ahorro voluntario en cuenta AFC autorizado por el trabajador.',
  },
  cooperativa: {
    type: 'deduccion',
    label: 'Aportes a cooperativa',
    description: 'Aportes a cooperativas legalmente constituidas.',
  },
  plan_complementario: {
    type: 'deduccion',
    label: 'Plan complementario de salud',
    description: 'Plan complementario al que el trabajador se encuentra afiliado.',
  },
  educacion: {
    type: 'deduccion',
    label: 'Descuento educativo',
    description: 'Servicios educativos que el trabajador autoriza descontar.',
  },
  reintegro: {
    type: 'deduccion',
    label: 'Reintegro a la empresa',
    description: 'Devolución por un devengo mal realizado en otro pago de nómina.',
  },
} as const

export type PayrollConceptType = 'devengo' | 'deduccion'

export const PAYROLL_CONCEPT_TYPES: PayrollConceptType[] = ['devengo', 'deduccion']

export const PAYROLL_CONCEPT_CALCULATIONS = ['fijo', 'porcentaje'] as const
export type PayrollConceptCalculation =
  (typeof PAYROLL_CONCEPT_CALCULATIONS)[number]

export interface IPayrollConceptInput {
  type: PayrollConceptType
  code: string
  name: string
  description?: string
  dianBlock: PayrollConceptDianBlock
  calculation: PayrollConceptCalculation
  value: number
  active?: boolean
  sortOrder?: number
}
