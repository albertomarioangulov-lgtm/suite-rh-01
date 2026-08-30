import { Shift } from '~~/server/models/Shift'
import { Company } from '~~/server/models/Company'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { getTenantId } from '~~/server/utils/tenant'
import { logAudit } from '~~/server/utils/audit'
import {
  shiftCreateSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'
import {
  generateShiftNotification,
  validateShiftHours,
} from '~~/server/services/shift.service'

/** Crea un turno. Acceso: admin, manager, hr. */
export default defineEventHandler(async (event) => {
  const { userId } = await authorize(event, [
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
  const data = validateWithSchema(shiftCreateSchema, body)

  const validation = await validateShiftHours(data.days)
  if (!validation.valid) {
    throw createError({
      statusCode: 400,
      message: validation.errors.join(' · '),
    })
  }

  const existing = await Shift.findOne({
    tenantId: company._id,
    name: data.name,
  })
  if (existing) {
    throw createError({
      statusCode: 409,
      message: 'Ya existe un turno con ese nombre en la empresa.',
    })
  }

  const shift = await Shift.create({
    ...data,
    tenantId: company._id,
    createdBy: userId,
  })

  await logAudit({
    module: 'shift',
    action: 'create',
    entityId: String(shift._id),
    userId,
    description: `Turno creado: ${shift.name}`,
  })
  await generateShiftNotification(`Nuevo turno creado: ${shift.name}`)

  return shift.toJSON()
})
