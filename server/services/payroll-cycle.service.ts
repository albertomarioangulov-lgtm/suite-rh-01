import { PayrollCycle } from '~~/server/models/PayrollCycle'
import { Employee } from '~~/server/models/Employee'
import mongoose from 'mongoose'
import { logAudit } from '~~/server/utils/audit'
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

/**
 * Mueve un empleado de su ciclo actual a otro (o al por defecto).
 * El cambio es prospectivo: solo afecta nóminas futuras; las ya liquidadas
 * conservan su snapshot de PeriodoNomina. Queda registrado en auditoría.
 */
export const moveEmployeeToCycle = async (params: {
  tenantId: string
  employeeId: string
  fromCycleId: string
  fromCycleName: string
  fromCycleIsDefault: boolean
  toCycleId: string | null
  toCycleName: string
  userId?: string
  userName?: string
}) => {
  const employee = await Employee.findOne({
    _id: params.employeeId,
    tenantId: params.tenantId,
  })
  if (!employee) {
    throw createError({ statusCode: 404, message: 'Empleado no encontrado' })
  }

  const current = employee.payrollCycle
    ? String(employee.payrollCycle)
    : null
  const belongsToSource =
    current === params.fromCycleId ||
    (params.fromCycleIsDefault && current === null)
  if (!belongsToSource) {
    throw createError({
      statusCode: 400,
      message: 'El empleado no pertenece al ciclo de origen.',
    })
  }

  employee.payrollCycle = params.toCycleId
    ? new mongoose.Types.ObjectId(params.toCycleId)
    : null
  await employee.save()

  await logAudit({
    module: 'payroll-cycle',
    action: 'move',
    entityId: params.employeeId,
    userId: params.userId,
    userName: params.userName,
    description: `Empleado ${employee.firstName} ${employee.lastName} movido de "${params.fromCycleName}" a "${params.toCycleName}"`,
    changes: {
      from: { cycleId: params.fromCycleId, name: params.fromCycleName },
      to: { cycleId: params.toCycleId, name: params.toCycleName },
    },
  })

  return employee.toJSON()
}
