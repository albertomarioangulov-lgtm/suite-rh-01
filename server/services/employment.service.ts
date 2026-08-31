import { Employee } from '~~/server/models/Employee'
import { EmploymentPeriod } from '~~/server/models/EmploymentPeriod'

/**
 * Crea el período de vinculación de un empleado al ingresar/reingresar.
 * Debe existir un único período activo por empleado.
 */
export const createEmploymentPeriod = async (
  employeeId: string,
  hireDate: Date,
  userId?: string,
) => {
  const employee = await Employee.findById(employeeId)
  if (!employee) {
    throw createError({ statusCode: 404, message: 'Empleado no encontrado' })
  }

  const active = await EmploymentPeriod.findOne({
    employee: employeeId,
    status: 'active',
  })
  if (active) {
    throw createError({
      statusCode: 409,
      message: 'El empleado ya tiene un período de vinculación activo.',
    })
  }

  const period = await EmploymentPeriod.create({
    tenantId: employee.tenantId,
    employee: employee._id,
    hireDate,
    terminationDate: null,
    status: 'active',
    createdBy: userId,
  })

  // Sincroniza el empleado (activo + fecha de ingreso).
  employee.active = true
  employee.hireDate = hireDate
  employee.terminationDate = null
  employee.terminationReason = null
  await employee.save()

  return period.toJSON()
}

/**
 * Termina el período activo del empleado (baja) y registra fecha y motivo.
 * Si no existe período, crea uno desde la fecha de ingreso del empleado
 * (migración de empleados previos).
 */
export const terminateEmploymentPeriod = async (
  employeeId: string,
  terminationDate: Date,
  terminationReason?: string,
  userId?: string,
) => {
  const employee = await Employee.findById(employeeId)
  if (!employee) {
    throw createError({ statusCode: 404, message: 'Empleado no encontrado' })
  }

  let period = await EmploymentPeriod.findOne({
    employee: employeeId,
    status: 'active',
  })
  if (!period) {
    // Sin período registrado: se crea uno desde la fecha de ingreso.
    period = await EmploymentPeriod.create({
      tenantId: employee.tenantId,
      employee: employee._id,
      hireDate: employee.hireDate ?? terminationDate,
      terminationDate,
      terminationReason: terminationReason ?? 'otro',
      status: 'terminated',
      createdBy: userId,
    })
  } else {
    period.terminationDate = terminationDate
    period.terminationReason = terminationReason ?? 'otro'
    period.status = 'terminated'
    await period.save()
  }

  employee.active = false
  employee.terminationDate = terminationDate
  employee.terminationReason = (terminationReason ?? 'otro') as never
  await employee.save()

  return period.toJSON()
}

/** Historial completo de períodos de un empleado (más reciente primero). */
export const getEmployeePeriods = (employeeId: string) =>
  EmploymentPeriod.find({ employee: employeeId }).sort({ hireDate: -1 })

/** Período activo del empleado (si existe). */
export const getActivePeriod = (employeeId: string) =>
  EmploymentPeriod.findOne({ employee: employeeId, status: 'active' })
