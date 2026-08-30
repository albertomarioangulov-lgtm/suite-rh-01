#!/usr/bin/env node
/**
 * Migración: corrige fechas date-only almacenadas a medianoche UTC
 * (00:00:00.000Z) moviéndolas a mediodía UTC (12:00:00.000Z).
 *
 * Contexto: antes de esta corrección, los campos de solo fecha
 * (periodStart/periodEnd de nómina, startDate/endDate de ausencias,
 * validFrom de parámetros legales, hireDate de empleados) se guardaban con
 * z.coerce.date() como medianoche UTC. En zonas como Colombia (UTC-5) eso
 * se muestra como el día anterior.
 *
 * Uso:
 *   pnpm tsx scripts/fix-midnight-date-fields.mjs
 *   MONGODB_URI=mongodb+srv://... node scripts/fix-midnight-date-fields.mjs
 *
 * Idempotente: solo toca documentos con horas 00:00-11:59 UTC en los campos
 * indicados y puede ejecutarse de nuevo sin efectos secundarios.
 */
import 'dotenv/config'
import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || ''
const MONGODB_NAME = process.env.MONGODB_NAME || 'nomina_app'

/** Campos de fecha "date-only" por colección (los que vienen del formulario). */
const FIELDS_BY_COLLECTION = {
  payrolls: ['periodStart', 'periodEnd'],
  absences: ['startDate', 'endDate', 'scheduledRestDate'],
  legalparams: ['validFrom', 'validTo'],
  employees: ['hireDate'],
}

const hasMidnightOffset = (value) => {
  if (!value || !(value instanceof Date)) return false
  const hours = value.getUTCHours()
  return hours >= 0 && hours < 12
}

const fixDocument = (doc, fields) => {
  const changedFields = []
  for (const field of fields) {
    const value = doc[field]
    if (hasMidnightOffset(value)) {
      // Suma 12h: de 00:00 → 12:00 UTC (mismo día calendario en Colombia).
      doc[field] = new Date(value.getTime() + 12 * 60 * 60 * 1000)
      changedFields.push(field)
    }
  }
  return changedFields
}

async function main() {
  if (!MONGODB_URI) {
    console.error('Falta MONGODB_URI en el entorno.')
    process.exit(1)
  }

  const uri = `${MONGODB_URI}/${MONGODB_NAME}?retryWrites=true&w=majority`
  await mongoose.connect(uri)

  let totalFixed = 0
  for (const [collection, fields] of Object.entries(FIELDS_BY_COLLECTION)) {
    const model = mongoose.connection.collection(collection)
    const cursor = model.find({})
    let fixed = 0

    for await (const doc of cursor) {
      const changedFields = fixDocument(doc, fields)
      if (changedFields.length > 0) {
        const set = Object.fromEntries(
          changedFields.map((field) => [field, doc[field]]),
        )
        await model.updateOne({ _id: doc._id }, { $set: set })
        fixed += 1
      }
    }
    console.log(`${collection}: ${fixed} documento(s) corregido(s)`)
    totalFixed += fixed
  }

  console.log(`Total: ${totalFixed} documento(s) actualizado(s)`)
  await mongoose.disconnect()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
