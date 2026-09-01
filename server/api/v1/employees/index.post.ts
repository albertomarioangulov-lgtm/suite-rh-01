import { Employee } from '~~/server/models/Employee'
import { Company } from '~~/server/models/Company'
import { User } from '~~/server/models/User'
import { ROLES } from '~~/shared/auth'
import { getTenantId, syncUserTenants } from '~~/server/utils/tenant'
import { authorize } from '~~/server/utils/authorize'
import {
  employeeCreateSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'

/**
 * Crea un empleado. Acceso: admin, manager, hr.
 * La cuenta de usuario se resuelve según accountMode:
 * - none: ficha sin usuario.
 * - link: vincular usuario existente (rol employee, sin otra ficha).
 * - create: crear el usuario en el acto con rol employee.
 */
export default defineEventHandler(async (event) => {
  const { userId: actorId } = await authorize(event, [
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.HR,
  ])

  const tenantId = await getTenantId(event)
  const company = tenantId ? await Company.findById(tenantId) : null
  if (!company) {
    throw createError({
      statusCode: 409,
      message: 'Configura primero los datos de la empresa.',
    })
  }

  const body = await readBody(event)
  const data = validateWithSchema(employeeCreateSchema, body)

  let linkedUserId: string | null = null

  if (data.accountMode === 'link') {
    if (!data.userId) {
      throw createError({
        statusCode: 400,
        message: 'Selecciona el usuario a vincular.',
      })
    }
    const user = await User.findById(data.userId)
    if (!user) {
      throw createError({ statusCode: 400, message: 'El usuario no existe.' })
    }
    if (user.role !== ROLES.EMPLOYEE) {
      throw createError({
        statusCode: 400,
        message: 'El usuario a vincular debe tener rol empleado.',
      })
    }
    const linked = await Employee.findOne({
      tenantId: company._id,
      user: user._id,
    })
    if (linked) {
      throw createError({
        statusCode: 409,
        message: 'Ese usuario ya tiene una ficha de empleado en la empresa.',
      })
    }
    linkedUserId = data.userId
  } else if (data.accountMode === 'create') {
    if (!data.createEmail || !data.createPassword) {
      throw createError({
        statusCode: 400,
        message:
          'Correo y contraseña son requeridos para crear la cuenta.',
      })
    }
    const existingUser = await User.findOne({
      email: data.createEmail.toLowerCase(),
    })
    if (existingUser) {
      throw createError({
        statusCode: 409,
        message: 'Ya existe un usuario con ese correo.',
      })
    }
    const newUser = await User.create({
      name: `${data.firstName} ${data.lastName}`.trim(),
      email: data.createEmail.toLowerCase(),
      password: data.createPassword,
      role: ROLES.EMPLOYEE,
      active: true,
    })
    linkedUserId = newUser._id.toString()
  }

  const existing = await Employee.findByDocument(company._id, data.document)
  if (existing) {
    throw createError({
      statusCode: 409,
      message: 'Ya existe un empleado con ese documento en la empresa.',
    })
  }

  const employeeEmail =
    data.email ??
    (data.accountMode === 'create' ? data.createEmail : undefined)
  if (employeeEmail) {
    const emailExists = await Employee.findOne({
      tenantId: company._id,
      email: employeeEmail,
    })
    if (emailExists) {
      throw createError({
        statusCode: 409,
        message: 'Ya existe un empleado con ese email en la empresa.',
      })
    }
  }

  const employee = await Employee.create({
    tenantId: company._id,
    user: linkedUserId,
    document: data.document,
    documentType: data.documentType,
    firstName: data.firstName,
    lastName: data.lastName,
    email: employeeEmail,
    hireDate: data.hireDate,
    contractType: data.contractType,
    employeeType: data.employeeType,
    subEmployeeType: data.subEmployeeType,
    salarioIntegral: data.salarioIntegral,
    bankName: data.bankName ?? '',
    accountType: data.accountType ?? null,
    accountNumber: data.accountNumber ?? '',
    payrollCycle: data.payrollCycle ?? null,
    baseSalary: data.baseSalary,
    position: data.position,
    department: data.department ?? null,
    manager: data.manager ?? null,
    assignedShift: data.assignedShift,
    active: data.active,
    createdBy: actorId,
  })

  // Multi-tenant: actualiza la lista de empresas del usuario vinculado.
  if (linkedUserId) {
    await syncUserTenants(linkedUserId)
  }

  return employee.toJSON()
})
