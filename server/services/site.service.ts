import { Site } from '~~/server/models/Site'
import { Department } from '~~/server/models/Department'
import { Employee } from '~~/server/models/Employee'
import type { siteCreateSchema, siteUpdateSchema } from '~~/server/utils/validation-schemas'
import type { z } from 'zod'

type SiteCreateInput = z.infer<typeof siteCreateSchema>
type SiteUpdateInput = z.infer<typeof siteUpdateSchema>

const unsetMain = async (tenantId: unknown) => {
  await Site.updateMany(
    { tenantId, isMain: true },
    { $set: { isMain: false } },
  )
}

/** Lista las sedes de la empresa, la principal primero. */
export const listSites = async (tenantId: unknown) =>
  Site.find({ tenantId })
    .sort({ isMain: -1, sortOrder: 1, name: 1 })
    .lean()

/** Crea una sede. La primera sede de la empresa siempre es la principal. */
export const createSite = async (tenantId: unknown, data: SiteCreateInput) => {
  const count = await Site.countDocuments({ tenantId })
  const isMain = data.isMain ?? count === 0
  if (isMain) await unsetMain(tenantId)
  return Site.create({ tenantId, ...data, isMain })
}

/** Actualiza una sede y mantiene la regla de una sola principal. */
export const updateSite = async (
  tenantId: unknown,
  id: string,
  data: SiteUpdateInput,
) => {
  const site = await Site.findOne({ _id: id, tenantId })
  if (!site) {
    throw createError({ statusCode: 404, message: 'Sede no encontrada' })
  }

  let isMain = data.isMain
  if (isMain === true) {
    await unsetMain(tenantId)
  } else if (isMain === false && site.isMain) {
    const others = await Site.countDocuments({
      tenantId,
      _id: { $ne: id },
      active: true,
    })
    if (others > 0) {
      throw createError({
        statusCode: 400,
        message:
          'La sede principal no puede dejar de ser principal mientras existan otras sedes; designa otra como principal.',
      })
    }
    isMain = true // única sede: se conserva como principal
  }

  const { isMain: _ignored, ...rest } = data
  Object.assign(site, rest, isMain !== undefined ? { isMain } : {})
  await site.save()
  return site.toJSON()
}

/**
 * Elimina una sede. No se puede si tiene empleados o áreas asignadas, ni si
 * es la principal o la única de la empresa (siempre debe quedar una activa).
 */
export const deleteSite = async (tenantId: unknown, id: string) => {
  const site = await Site.findOne({ _id: id, tenantId })
  if (!site) {
    throw createError({ statusCode: 404, message: 'Sede no encontrada' })
  }

  const [employees, departments] = await Promise.all([
    Employee.countDocuments({ tenantId, sedeId: id }),
    Department.countDocuments({ tenantId, sedeId: id }),
  ])
  if (employees > 0 || departments > 0) {
    throw createError({
      statusCode: 400,
      message:
        'La sede tiene empleados o áreas asignados. Reasígnalos antes de eliminarla.',
    })
  }

  const others = await Site.countDocuments({
    tenantId,
    _id: { $ne: id },
    active: true,
  })
  if (others === 0) {
    throw createError({
      statusCode: 400,
      message: 'La empresa debe tener al menos una sede activa.',
    })
  }
  if (site.isMain) {
    throw createError({
      statusCode: 400,
      message:
        'No se puede eliminar la sede principal. Desactívala o designa otra como principal primero.',
    })
  }

  await site.deleteOne()
  return { id }
}
