#!/usr/bin/env node
/**
 * Reconstruye el índice único de email de empleados como SPARSE y limpia
 * registros con email vacío (""), que violaban el índice.
 *
 * Uso (apuntando a la BD correcta):
 *   DOTENV_CONFIG_PATH=.env.ami.dev node scripts/fix-employee-email-index.mjs
 */
import 'dotenv/config'
import mongoose from 'mongoose'

const uri = `${process.env.MONGODB_URI}/${process.env.MONGODB_NAME || 'nomina_app'}?retryWrites=true&w=majority`
await mongoose.connect(uri)
const collection = mongoose.connection.collection('employees')

// 1) Elimina emails vacíos: el índice sparse ignora el campo ausente.
const cleaned = await collection.updateMany(
  { email: '' },
  { $unset: { email: '' } },
)
console.log(`Empleados con email vacío limpiados: ${cleaned.modifiedCount}`)

// 2) Reemplaza el índice (por si quedó una versión antigua no-sparse).
try {
  await collection.dropIndex('tenantId_1_email_1')
  console.log('Índice anterior eliminado')
} catch {
  console.log('Índice anterior no existía (ok)')
}

await collection.createIndex(
  { tenantId: 1, email: 1 },
  { unique: true, sparse: true },
)
console.log('Índice único sparse (tenantId + email) creado')
await mongoose.disconnect()
