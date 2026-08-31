import { Contract } from '~~/server/models/Contract'
import { Employee } from '~~/server/models/Employee'
import { EmploymentPeriod } from '~~/server/models/EmploymentPeriod'

/** Crea un contrato vinculado a un período de vinculación del empleado. */
export const createContract = async (
  data: {
    employeeId: string
    employmentPeriodId: string
    type: string
    startDate: Date
    endDate?: Date | null
    salary: number
    position?: string
    documentUrl?: string
  },
  userId?: string,
) => {
  const employee = await Employee.findById(data.employeeId)
  if (!employee) {
    throw createError({ statusCode: 404, message: 'Empleado no encontrado' })
  }
  const period = await EmploymentPeriod.findById(data.employmentPeriodId)
  if (!period) {
    throw createError({ statusCode: 404, message: 'Período de vinculación no encontrado' })
  }
  if (String(period.employee) !== String(employee._id)) {
    throw createError({
      statusCode: 400,
      message: 'El período no pertenece a ese empleado.',
    })
  }

  const contract = await Contract.create({
    tenantId: employee.tenantId,
    employee: employee._id,
    employmentPeriod: period._id,
    type: data.type,
    startDate: data.startDate,
    endDate: data.endDate ?? null,
    salary: data.salary,
    position: data.position,
    documentUrl: data.documentUrl,
    status: 'active',
    createdBy: userId,
  })

  // El período referencia su contrato vigente.
  period.contract = contract._id
  await period.save()

  return contract.toJSON()
}

/** Renueva un contrato: el anterior pasa a 'renewed' y se crea uno nuevo. */
export const renewContract = async (
  contractId: string,
  data: {
    endDate: Date
    salary?: number
    position?: string
  },
  userId?: string,
) => {
  const previous = await Contract.findById(contractId)
  if (!previous) {
    throw createError({ statusCode: 404, message: 'Contrato no encontrado' })
  }
  if (previous.status !== 'active') {
    throw createError({
      statusCode: 400,
      message: 'Solo se renuevan contratos activos.',
    })
  }

  previous.status = 'renewed'
  await previous.save()

  const renewal = await Contract.create({
    tenantId: previous.tenantId,
    employee: previous.employee,
    employmentPeriod: previous.employmentPeriod,
    type: previous.type,
    startDate: previous.endDate ?? new Date(),
    endDate: data.endDate,
    salary: data.salary ?? previous.salary,
    position: data.position ?? previous.position,
    documentUrl: previous.documentUrl,
    status: 'active',
    renewedFrom: previous._id,
    createdBy: userId,
  })

  const period = await EmploymentPeriod.findById(previous.employmentPeriod)
  if (period) {
    period.contract = renewal._id
    await period.save()
  }

  return renewal.toJSON()
}

/** Contratos de un empleado (más reciente primero). */
export const getEmployeeContracts = (employeeId: string) =>
  Contract.find({ employee: employeeId }).sort({ startDate: -1 })
