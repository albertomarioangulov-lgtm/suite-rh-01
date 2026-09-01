import mongoose from 'mongoose'
import { Employee } from '~~/server/models/Employee'
import { PayrollCycle } from '~~/server/models/PayrollCycle'
import { User } from '~~/server/models/User'
import { ROLES } from '~~/shared/auth'
import { syncUserTenants } from '~~/server/utils/tenant'
import { authorize } from '~~/server/utils/authorize'
import { logAudit } from '~~/server/utils/audit'
import { ensureDefaultCycle } from '~~/server/services/payroll-cycle.service'
import {
  employeeUpdateSchema,
  mongoIdSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'

/** Actualiza un empleado. Acceso: admin, manager, hr. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])

  const id = validateWithSchema(
    mongoIdSchema,
    getRouterParam(event, 'id') || '',
  )
  const employee = await Employee.findById(id)
  if (!employee) {
    throw createError({
      statusCode: 404,
      message: 'Empleado no encontrado',
    })
  }
  const previousUser = employee.user ? String(employee.user) : null
  const previousCycleId = employee.payrollCycle
    ? String(employee.payrollCycle)
    : null

  const body = await readBody(event)
  const data = validateWithSchema(employeeUpdateSchema, body)

  if (data.userId) {
    const linkedUser = await User.findById(data.userId)
    if (!linkedUser || linkedUser.role !== ROLES.EMPLOYEE) {
      throw createError({
        statusCode: 400,
        message: 'El usuario a vincular debe existir y tener rol empleado.',
      })
    }
    const linked = await Employee.findOne({
      tenantId: employee.tenantId,
      user: data.userId,
      _id: { $ne: id },
    })
    if (linked) {
      throw createError({
        statusCode: 409,
        message: 'Ese usuario ya tiene una ficha de empleado en la empresa.',
      })
    }
  }

  if (data.unlinkUser && data.userId) {
    throw createError({
      statusCode: 400,
      message: 'No puedes desvincular y vincular un usuario a la vez.',
    })
  }

  if (data.document !== undefined && data.document !== employee.document) {
    const existing = await Employee.findOne({
      tenantId: employee.tenantId,
      document: data.document,
      _id: { $ne: id },
    })
    if (existing) {
      throw createError({
        statusCode: 409,
        message: 'Ya existe un empleado con ese documento en la empresa.',
      })
    }
  }

  if (data.email && data.email !== employee.email) {
    const existing = await Employee.findOne({
      tenantId: employee.tenantId,
      email: data.email,
      _id: { $ne: id },
    })
    if (existing) {
      throw createError({
        statusCode: 409,
        message: 'Ya existe un empleado con ese email en la empresa.',
      })
    }
  }

  if (data.userId !== undefined)
    employee.user = new mongoose.Types.ObjectId(data.userId)
  if (data.unlinkUser) employee.user = null
  if (data.document !== undefined) employee.document = data.document
  if (data.documentType !== undefined) employee.documentType = data.documentType
  if (data.firstName !== undefined) employee.firstName = data.firstName
  if (data.lastName !== undefined) employee.lastName = data.lastName
  if (data.email !== undefined) employee.email = data.email
  if (data.hireDate !== undefined) employee.hireDate = data.hireDate
  if (data.contractType !== undefined) employee.contractType = data.contractType
  if (data.employeeType !== undefined) employee.employeeType = data.employeeType
  if (data.subEmployeeType !== undefined)
    employee.subEmployeeType = data.subEmployeeType
  if (data.salarioIntegral !== undefined)
    employee.salarioIntegral = data.salarioIntegral
  if (data.bankName !== undefined) employee.bankName = data.bankName ?? ''
  if (data.accountType !== undefined)
    employee.accountType = data.accountType ?? null
  if (data.accountNumber !== undefined)
    employee.accountNumber = data.accountNumber ?? ''
  if (data.payrollCycle !== undefined)
    employee.payrollCycle = data.payrollCycle ?? null
  if (data.baseSalary !== undefined) employee.baseSalary = data.baseSalary
  if (data.position !== undefined) employee.position = data.position
  if (data.department !== undefined) employee.department = data.department ?? null
  if (data.manager !== undefined) employee.manager = data.manager ?? null
  if (data.assignedShift !== undefined)
    employee.assignedShift = data.assignedShift
  if (data.active !== undefined) employee.active = data.active

  await employee.save()

  // Auditoría del cambio de ciclo (afecta nóminas futuras).
  const nextCycleId = data.payrollCycle ?? null
  if (
    data.payrollCycle !== undefined &&
    nextCycleId !== previousCycleId
  ) {
    const defaultCycle = await ensureDefaultCycle(String(employee.tenantId))
    const cycleName = async (cycleId: string | null) => {
      if (!cycleId) return defaultCycle.name
      const cycle = await PayrollCycle.findById(cycleId)
      return cycle?.name ?? cycleId
    }
    const session = await getUserSession(event)
    const userName = (session.user as { name?: string } | undefined)?.name
    await logAudit({
      module: 'payroll-cycle',
      action: 'move',
      entityId: id,
      userId,
      userName,
      description: `Empleado ${employee.firstName} ${employee.lastName} movido de "${await cycleName(previousCycleId)}" a "${await cycleName(nextCycleId)}"`,
      changes: {
        from: { cycleId: previousCycleId, name: await cycleName(previousCycleId) },
        to: { cycleId: nextCycleId, name: await cycleName(nextCycleId) },
      },
    })
  }

  // Multi-tenant: sincroniza la lista de empresas de los usuarios afectados.
  if (data.userId) await syncUserTenants(data.userId)
  if (data.unlinkUser && previousUser) {
    await syncUserTenants(previousUser)
  }

  return employee.toJSON()
})
