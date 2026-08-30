import { Shift } from '~~/server/models/Shift'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import {
  mongoIdSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'

/** Detalle de un turno. Acceso: admin, manager, hr. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])

  const id = validateWithSchema(
    mongoIdSchema,
    getRouterParam(event, 'id') || '',
  )
  const shift = await Shift.findById(id)
    .populate('tenantId', 'name nit')
    .populate('createdBy', 'name email')
  if (!shift) {
    throw createError({ statusCode: 404, message: 'Turno no encontrado' })
  }

  return shift.toJSON()
})
