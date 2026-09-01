import { PayrollCycle } from '~~/server/models/PayrollCycle'
import { Employee } from '~~/server/models/Employee'
import {
  PAYROLL_FREQUENCIES,
  type PayrollFrequency,
} from '~~/shared/payroll-period'

/**
 * Asegura que exista el ciclo por defecto de la empresa y lo sincroniza
 * con la frecuencia configurada (empleados sin ciclo asignado).
 */
export const ensureDefaultCycle = async (
  tenantId: string,
  frequency: PayrollFrequency = 'mensual',
) => {
  const existing = await PayrollCycle.findOne({ tenantId, isDefault: true })
  if (existing) {
    if (existing.frequency !== frequency) {
      existing.frequency = frequency
      await existing.save()
    }
    return existing
  }
  const label = PAYROLL_FREQUENCIES[frequency]?.label ?? 'Mensual'
  return PayrollCycle.create({
    tenantId,
    name: `Por defecto (${label})`,
    frequency,
    isDefault: true,
    active: true,
    sortOrder: 0,
  })
}

/** Empleados activos que pertenecen a un ciclo. */
export const getCycleEmployeeCount = async (
  tenantId: string,
  cycleId: string,
  isDefault: boolean,
) => {
  if (isDefault) {
    return Employee.countDocuments({
      tenantId,
      active: true,
      $or: [{ payrollCycle: null }, { payrollCycle: cycleId }],
    })
  }
  return Employee.countDocuments({
    tenantId,
    active: true,
    payrollCycle: cycleId,
  })
}

/** Lista los ciclos de la empresa con el número de empleados activos. */
export const listCyclesWithCounts = async (tenantId: string) => {
  const items = await PayrollCycle.find({ tenantId })
    .sort({ isDefault: -1, sortOrder: 1, name: 1 })
    .lean()
  return Promise.all(
    items.map(async (cycle) => ({
      ...cycle,
      employeeCount: await getCycleEmployeeCount(
        tenantId,
        String(cycle._id),
        cycle.isDefault,
      ),
    })),
  )
}
