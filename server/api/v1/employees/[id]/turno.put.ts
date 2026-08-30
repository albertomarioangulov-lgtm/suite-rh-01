import { Employee } from '~~/server/models/Employee'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import {
  employeeAssignShiftSchema,
  mongoIdSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'

/** Asigna un turno a un empleado. Acceso: admin, manager, hr. */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR])

  const id = validateWithSchema(
    mongoIdSchema,
    getRouterParam(event, 'id') || '',
  )
  const employee = await Employee.findById(id)
  if (!employee) {
    throw createError({
      statusCode: 404,
      message: 'Empleado no encontrado',
    })
  }

  const body = await readBody(event)
  const data = validateWithSchema(employeeAssignShiftSchema, body)

  employee.assignedShift = data.assignedShift
  await employee.save()

  return employee.toJSON()
})
