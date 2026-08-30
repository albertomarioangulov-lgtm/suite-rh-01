import { User, type IUser } from '~~/server/models/User'
import type { QueryFilter } from 'mongoose'
import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { paginationSchema, validateWithSchema } from '~~/server/utils/validation-schemas'

// Campos permitidos para ordenar: evita inyección de campos arbitrarios en sort.
const SORTABLE_KEYS = ['name', 'email', 'role', 'active', 'createdAt', 'updatedAt']

export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN, ROLES.MANAGER])

  const query = validateWithSchema(paginationSchema, getQuery(event))
  const page = query.page
  const limit = query.limit
  const search = query.search || ''
  const role = query.role || ''
  const sortBy = query.sortBy && SORTABLE_KEYS.includes(query.sortBy) ? query.sortBy : 'createdAt'
  const sortOrder = (query.sortOrder || 'desc') === 'asc' ? 1 : -1

  const filter: QueryFilter<IUser> = {}
  if (role) filter.role = role as IUser['role']
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ]
  }

  const total = await User.countDocuments(filter)
  const users = await User.find(filter)
    .select('-password')
    .sort({ [sortBy]: sortOrder })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()

  return {
    items: users.map((user) => ({
      ...user,
      _id: user._id.toString(),
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
})
