#!/usr/bin/env node
/**
 * Migración ADR-002 (Fase A): crea la "Sede Principal" para empresas sin
 * sedes y asigna departamentos/empleados existentes a esa sede.
 *
 * Idempotente: si la empresa ya tiene sedes, solo garantiza que exista una
 * principal y asigna los registros sin sede.
 *
 * Uso:
 *   node scripts/backfill-main-site.mjs
 *
 * Requiere MONGODB_URI y MONGODB_NAME en .env (o variables de entorno).
 */
import 'dotenv/config'
import mongoose from 'mongoose'

const uri = `${process.env.MONGODB_URI}/${process.env.MONGODB_NAME || 'nomina_app'}?retryWrites=true&w=majority`
await mongoose.connect(uri)

const db = mongoose.connection.db
const companies = db.collection('companies')
const sites = db.collection('sites')
const departments = db.collection('departments')
const employees = db.collection('employees')

const activeCompanies = await companies.find({ active: true }).toArray()
let created = 0

for (const company of activeCompanies) {
  const existing = await sites.find({ tenantId: company._id }).limit(1).toArray()
  let main =
    (await sites.findOne({ tenantId: company._id, isMain: true })) ?? null

  if (!main) {
    if (existing.length === 0) {
      const now = new Date()
      main = await sites.insertOne({
        tenantId: company._id,
        name: `${company.name || 'Empresa'} - Principal`,
        code: 'PRINCIPAL',
        city: '',
        municipalityCode: company.municipalityCode || '',
        address: company.address || '',
        phone: '',
        isMain: true,
        active: true,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      })
      created++
      console.log(`✔ Sede Principal creada para: ${company.name}`)
    } else {
      // Existen sedes pero ninguna principal: se designa la primera.
      await sites.updateOne(
        { _id: existing[0]._id },
        { $set: { isMain: true } },
      )
      main = existing[0]
      console.log(`→ Sede principal designada para: ${company.name}`)
    }
  }

  if (main) {
    const assignedDepartments = await departments.updateMany(
      { tenantId: company._id, sedeId: { $in: [null, undefined] } },
      { $set: { sedeId: main.insertedId ?? main._id } },
    )
    const assignedEmployees = await employees.updateMany(
      { tenantId: company._id, sedeId: { $in: [null, undefined] } },
      { $set: { sedeId: main.insertedId ?? main._id } },
    )
    console.log(
      `   Sedes para ${company.name}: ${assignedDepartments.modifiedCount} áreas y ${assignedEmployees.modifiedCount} empleados asignados a la sede principal.`,
    )
  }
}

console.log(`Migración completa. Sedes principales creadas: ${created}`)
await mongoose.disconnect()
