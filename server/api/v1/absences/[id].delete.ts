import { Absence } from '~~/server/models/Absence'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'

/** Elimina una ausencia (solo pendiente). Acceso: admin. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN])
  const id = getRouterParam(event, 'id')

  const absence = await Absence.findById(id)
  if (!absence) {
    throw createError({ statusCode: 404, message: 'Ausencia no encontrada' })
  }
  if (absence.status !== 'pending') {
    throw createError({
      statusCode: 400,
      message: 'Solo se puede eliminar una ausencia pendiente.',
    })
  }
  await absence.deleteOne()
  return { success: true, id }
})
