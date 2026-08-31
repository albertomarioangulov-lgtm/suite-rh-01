import { Employee } from '~~/server/models/Employee'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { createEmploymentPeriod } from '~~/server/services/employment.service'
import { mongoIdSchema, validateWithSchema, z } from '~~/server/utils/validation-schemas'

const rehireSchema = z.object({
  hireDate: z.coerce.date(),
})

/** Reingreso: crea un nuevo período de vinculación activo. Acceso: admin. */
export default defineEventHandler(async (event) => {
  const { userId } = await authorize(event, [ROLES.ADMIN])
  const id = validateWithSchema(mongoIdSchema, getRouterParam(event, 'id') || '')
  const body = await readBody(event)
  const data = validateWithSchema(rehireSchema, body)

  const employee = await Employee.findById(id)
  if (!employee) {
    throw createError({ statusCode: 404, message: 'Empleado no encontrado' })
  }

  return createEmploymentPeriod(String(employee._id), data.hireDate, userId)
})
