#!/usr/bin/env node
/**
 * Migración multi-tenant: renombra el campo `company` → `tenantId` en las
 * colecciones de dominio (empleados, asistencia, ausencias, turnos, nóminas,
 * alertas, configuración de alertas y préstamos).
 *
 * - Crea el índice `tenantId` equivalente al índice `company` previo.
 * - Copia los datos de `company` a `tenantId` y elimina el campo viejo.
 * - Idempotente: si `tenantId` ya existe, no lo sobrescribe.
 *
 * Uso:
 *   node scripts/migrate-company-to-tenant-id.mjs
 */
import 'dotenv/config'
import mongoose from 'mongoose'

const COLLECTIONS = [
  'employees',
  'attendances',
  'absences',
  'shifts',
  'payrolls',
  'alerts',
  'alertconfigs',
  'loans',
]

const uri = `${process.env.MONGODB_URI}/${process.env.MONGODB_NAME || 'nomina_app'}?retryWrites=true&w=majority`
await mongoose.connect(uri)
const db = mongoose.connection.db

let total = 0
for (const collectionName of COLLECTIONS) {
  const collection = db.collection(collectionName)
  const exists = await collection
    .find({ company: { $exists: true } })
    .count()
  if (exists === 0) {
    console.log(`${collectionName}: sin documentos con company, se omite`)
    continue
  }

  // Copia company → tenantId (solo si tenantId no existe) y elimina company.
  const result = await collection.updateMany(
    { company: { $exists: true }, tenantId: { $exists: false } },
    [{ $set: { tenantId: '$company' } }, { $unset: 'company' }],
  )

  // Índice equivalente al de company (si existía).
  const indexes = await collection.indexes()
  const companyIndexes = indexes.filter((index) =>
    Object.keys(index.key).some((key) => key.startsWith('company')),
  )
  for (const index of companyIndexes) {
    const newKey = Object.fromEntries(
      Object.entries(index.key).map(([key, value]) => [
        key.replace(/^company/, 'tenantId'),
        value,
      ]),
    )
    try {
      await collection.createIndex(newKey, { unique: !!index.unique })
    } catch (error) {
      console.warn(`${collectionName}: índice ${index.name} no se recreó (${error.message})`)
    }
  }

  console.log(
    `${collectionName}: ${result.modifiedCount} documento(s) migrado(s) (${exists} con company)`,
  )
  total += result.modifiedCount
}

console.log(`Total migrado: ${total} documento(s)`)
await mongoose.disconnect()
