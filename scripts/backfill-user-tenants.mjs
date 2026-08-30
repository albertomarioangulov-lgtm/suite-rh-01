#!/usr/bin/env node
/**
 * Respaldo multi-tenant: puebla `tenantIds` y `tenantActivo` de los usuarios
 * a partir de sus fichas de empleado vinculadas (Employee.user).
 *
 * Idempotente: reemplaza la lista de tenants por la calculada desde los
 * empleados; el tenant activo solo se fija si no existe o si queda uno solo.
 *
 * Uso:
 *   node scripts/backfill-user-tenants.mjs
 */
import 'dotenv/config'
import mongoose from 'mongoose'

const uri = `${process.env.MONGODB_URI}/${process.env.MONGODB_NAME || 'nomina_app'}?retryWrites=true&w=majority`
await mongoose.connect(uri)
const db = mongoose.connection.db

const users = db.collection('users')
const employees = db.collection('employees')

const userDocs = await users.find({}).toArray()
let updated = 0

for (const user of userDocs) {
  const linked = await employees
    .find({ user: user._id, tenantId: { $exists: true } })
    .project({ tenantId: 1 })
    .toArray()
  const tenantIds = Array.from(
    new Set(linked.map((employee) => String(employee.tenantId)).filter(Boolean)),
  )

  if (tenantIds.length === 0) continue

  const currentActivo = user.tenantActivo ? String(user.tenantActivo) : null
  const nextActivo =
    currentActivo && tenantIds.includes(currentActivo)
      ? new mongoose.Types.ObjectId(currentActivo)
      : new mongoose.Types.ObjectId(tenantIds[0])

  await users.updateOne(
    { _id: user._id },
    {
      $set: {
        tenantIds: tenantIds.map((id) => new mongoose.Types.ObjectId(id)),
        tenantActivo: nextActivo,
      },
    },
  )
  updated += 1
}

console.log(`usuarios con tenants actualizados: ${updated}`)
await mongoose.disconnect()
