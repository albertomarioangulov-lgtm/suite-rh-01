import { randomUUID } from 'node:crypto'
import { User } from '~~/server/models/User'
import { Employee } from '~~/server/models/Employee'
import { Company } from '~~/server/models/Company'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId, syncUserTenants } from '~~/server/utils/tenant'
import { sendInviteEmail } from '~~/server/utils/brevo'
import { logEmailEvent } from '~~/server/utils/email-log'
import { generateInviteToken } from '~~/server/utils/invite'
import { userCreateSchema, validateWithSchema } from '~~/server/utils/validation-schemas'

export default defineEventHandler(async (event) => {
  const { userId: actorId } = await authorize(event, [ROLES.ADMIN])

  const body = await readBody(event)
  const data = validateWithSchema(userCreateSchema, body)

  const existingUser = await User.findOne({ email: data.email })
  if (existingUser) {
    throw createError({
      statusCode: 409,
      message: 'El correo ya está registrado',
    })
  }

  // Con invitación no hace falta contraseña inicial: se genera una aleatoria
  // y el invitado define la suya desde el enlace.
  const password = data.password ?? randomUUID()
  const user = await User.create({
    name: data.name,
    email: data.email,
    password,
    role: data.role,
    active: data.active,
  })

  // Creación inversa: usuario con rol employee puede generar su ficha.
  let employeeCreated = false
  if (data.employee && data.role === ROLES.EMPLOYEE) {
    const tenantId = await getTenantId(event)
    const company = tenantId ? await Company.findById(tenantId) : null
    if (!company) {
      throw createError({
        statusCode: 409,
        message: 'Configura primero los datos de la empresa.',
      })
    }
    const existingDoc = await Employee.findOne({
      tenantId: company._id,
      document: data.employee.document,
    })
    if (existingDoc) {
      throw createError({
        statusCode: 409,
        message: 'Ya existe un empleado con ese documento en la empresa.',
      })
    }
    const emailExists = await Employee.findOne({
      tenantId: company._id,
      email: user.email,
    })
    if (emailExists) {
      throw createError({
        statusCode: 409,
        message: 'Ya existe un empleado con ese email en la empresa.',
      })
    }
    await Employee.create({
      tenantId: company._id,
      user: user._id,
      document: data.employee.document,
      firstName: data.employee.firstName,
      lastName: data.employee.lastName,
      email: user.email,
      hireDate: data.employee.hireDate,
      contractType: data.employee.contractType,
      baseSalary: data.employee.baseSalary,
      position: data.employee.position,
      active: true,
      createdBy: actorId,
    })
    await syncUserTenants(String(user._id))
    employeeCreated = true
  }

  let inviteSent = false
  if (data.invite) {
    const { token, hash, expiresAt } = generateInviteToken()
    user.inviteTokenHash = hash
    user.inviteTokenExpiresAt = expiresAt
    user.emailStatus = 'pending'
    await user.save()

    const appUrl = String(useRuntimeConfig(event).appUrl || 'http://localhost:3000')
    const inviteUrl = `${appUrl}/auth/invite?token=${token}`
    try {
      const messageId = await sendInviteEmail({
        email: user.email,
        name: user.name,
        inviteUrl,
      })
      await logEmailEvent({
        email: user.email,
        status: 'pending',
        eventName: 'sent',
        messageId,
        eventAt: new Date(),
      })
      inviteSent = true
    } catch (error) {
      console.error('No se pudo enviar la invitación:', error)
      await logEmailEvent({
        email: user.email,
        status: 'failed',
        eventName: 'send_error',
        eventAt: new Date(),
      })
    }
  }

  return { ...user.toJSON(), inviteSent, employeeCreated }
})
