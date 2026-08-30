import { Absence } from '~~/server/models/Absence'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'

/** Detalle de una ausencia. Acceso: admin, manager, hr. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])
  const id = getRouterParam(event, 'id')

  const absence = await Absence.findById(id)
    .populate('employee', 'firstName lastName document position baseSalary')
    .populate('approvedBy', 'name email')
  if (!absence) {
    throw createError({ statusCode: 404, message: 'Ausencia no encontrada' })
  }
  return absence.toJSON()
})
