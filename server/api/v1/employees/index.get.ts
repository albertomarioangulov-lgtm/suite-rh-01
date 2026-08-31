import type { QueryFilter } from 'mongoose'
import { Employee, type IEmployee } from '~~/server/models/Employee'
import { ROLES } from '~~/shared/auth'
import { getTenantId, requireFlag } from '~~/server/utils/tenant'
import { FEATURE_FLAGS } from '~~/shared/feature-flags'
import {
  paginationSchema,
  validateWithSchema,
} from '~~/server/utils/validation-schemas'

const SORTABLE_KEYS = [
  'document',
  'firstName',
  'lastName',
  'position',
  'contractType',
  'hireDate',
  'baseSalary',
  'createdAt',
]

/** Lista de empleados con paginación, filtros y búsqueda. Acceso: admin, manager, hr. */
export default defineEventHandler(async (event) => {
  await requireFlag(event, [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR], FEATURE_FLAGS.EMPLOYEES)

  const tenantId = await getTenantId(event)
  if (!tenantId) {
    return { items: [], total: 0, page: 1, limit: 0, totalPages: 0 }
  }

  const query = validateWithSchema(paginationSchema, getQuery(event))
  const search = query.search || ''
  const active = String(getQuery(event).active || '')

  const filter: QueryFilter<IEmployee> = { tenantId }
  if (active === 'true') filter.active = true
  if (active === 'false') filter.active = false
  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { document: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ]
  }

  const sortBy =
    query.sortBy && SORTABLE_KEYS.includes(query.sortBy)
      ? query.sortBy
      : 'createdAt'
  const sortOrder = (query.sortOrder || 'desc') === 'asc' ? 1 : -1

  const total = await Employee.countDocuments(filter)
  const items = await Employee.find(filter)
    .sort({ [sortBy]: sortOrder })
    .skip((query.page - 1) * query.limit)
    .limit(query.limit)
    .populate('department', 'name')
    .populate('manager', 'firstName lastName')
    .lean()

  return {
    items: items.map((item) => ({ ...item, _id: item._id.toString() })),
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit),
  }
})
