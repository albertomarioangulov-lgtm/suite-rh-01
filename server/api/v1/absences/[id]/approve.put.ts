import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { approveAbsence } from '~~/server/services/absence.service'

/** Aprueba una ausencia. Acceso: admin, manager, hr. */
export default defineEventHandler(async (event) => {
  const { userId } = await authorize(event, [
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.HR,
  ])
  const id = getRouterParam(event, 'id')
  return approveAbsence(id, userId)
})
