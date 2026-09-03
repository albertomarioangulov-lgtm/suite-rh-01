#!/usr/bin/env node
/**
 * Reconstruye el índice único de email de empleados como PARCIAL
 * (solo emails tipo string) y limpia registros con email vacío/null.
 *
 * Uso (apuntando a la BD correcta):
 *   DOTENV_CONFIG_PATH=.env.ami.dev node scripts/fix-employee-email-index.mjs
 */
import 'dotenv/config'
import mongoose from 'mongoose'

const uri = `${process.env.MONGODB_URI}/${process.env.MONGODB_NAME || 'nomina_app'}?retryWrites=true&w=majority`
await mongoose.connect(uri)
const collection = mongoose.connection.collection('employees')

// 1) Elimina el índice ANTES de tocar datos: mientras exista el índice
//    único no-sparse, convertir "" o null en campo ausente choca (dup null).
try {
  await collection.dropIndex('tenantId_1_email_1')
  console.log('Índice anterior eliminado')
} catch {
  console.log('Índice anterior no existía (ok)')
}

// 2) Limpia emails vacíos/null/ausentes: el índice parcial solo indexa
//    emails de tipo string, así que estos nunca colisionan.
const cleaned = await collection.updateMany(
  { email: { $not: { $type: 'string' } } },
  { $unset: { email: '' } },
)
console.log(
  `Empleados con email vacío/null/ausente limpiados: ${cleaned.modifiedCount}`,
)

// 3) Recrea el índice único PARCIAL (email de tipo string).
await collection.createIndex(
  { tenantId: 1, email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: 'string' } },
  },
)
console.log('Índice único parcial (tenantId + email string) creado')

const indexes = await collection.indexes()
const emailIndex = indexes.find((index) => index.name === 'tenantId_1_email_1')
if (!emailIndex?.partialFilterExpression) {
  console.error(
    'ERROR: el índice tenantId_1_email_1 no quedó parcial. Revisa permisos.',
  )
  process.exitCode = 1
} else {
  console.log('Verificado: tenantId_1_email_1 es parcial (email string)')
}
await mongoose.disconnect()
