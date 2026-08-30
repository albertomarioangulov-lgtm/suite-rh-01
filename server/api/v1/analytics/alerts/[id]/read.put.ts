import { Alert } from '~~/server/models/Alert'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'

/** Marca una alerta como leída. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])
  const id = getRouterParam(event, 'id')

  const alert = await Alert.findById(id)
  if (!alert) {
    throw createError({ statusCode: 404, message: 'Alerta no encontrada' })
  }
  alert.read = true
  await alert.save()
  return { success: true, id: alert._id }
})
