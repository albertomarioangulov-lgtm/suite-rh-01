import { Shift } from '~~/server/models/Shift'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { logAudit } from '~~/server/utils/audit'
import {
  mongoIdSchema,
  shiftUpdateSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'
import { validateShiftHours } from '~~/server/services/shift.service'

/** Actualiza un turno. Acceso: admin, manager, hr. */
export default defineEventHandler(async (event) => {
  const { userId } = await authorize(event, [
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.HR,
  ])

  const id = validateWithSchema(
    mongoIdSchema,
    getRouterParam(event, 'id') || '',
  )
  const shift = await Shift.findById(id)
  if (!shift) {
    throw createError({ statusCode: 404, message: 'Turno no encontrado' })
  }

  const body = await readBody(event)
  const data = validateWithSchema(shiftUpdateSchema, body)

  if (data.days) {
    const validation = await validateShiftHours(data.days)
    if (!validation.valid) {
      throw createError({
        statusCode: 400,
        message: validation.errors.join(' · '),
      })
    }
  }

  if (data.name && data.name !== shift.name) {
    const existing = await Shift.findOne({
      tenantId: shift.tenantId,
      name: data.name,
      _id: { $ne: id },
    })
    if (existing) {
      throw createError({
        statusCode: 409,
        message: 'Ya existe un turno con ese nombre en la empresa.',
      })
    }
  }

  if (data.name !== undefined) shift.name = data.name
  if (data.type !== undefined) shift.type = data.type
  if (data.days !== undefined) shift.days = data.days
  if (data.description !== undefined) shift.description = data.description
  if (data.color !== undefined) shift.color = data.color
  if (data.active !== undefined) shift.active = data.active

  await shift.save()
  await logAudit({
    module: 'shift',
    action: 'update',
    entityId: id,
    userId,
    description: `Turno actualizado: ${shift.name}`,
  })

  return shift.toJSON()
})
