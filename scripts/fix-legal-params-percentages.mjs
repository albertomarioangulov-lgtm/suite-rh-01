#!/usr/bin/env node
/**
 * Reparación de parámetros legales: normaliza los porcentajes de salud y
 * pensión almacenados como enteros (4 / 8.5 / 12) al formato decimal
 * (0.04 / 0.085 / 0.12) que espera el motor de nómina.
 *
 * También elimina las nóminas demo corruptas de la ventana de los últimos
 * 4 meses (períodos mal cortados y totales en cero por la mala lectura de
 * porcentajes), para que puedas re-ejecutar:
 *   node scripts/seed-demo-payroll-month.mjs
 *
 * Uso:
 *   node scripts/fix-legal-params-percentages.mjs
 */
import 'dotenv/config'
import mongoose from 'mongoose'

const uri = `${process.env.MONGODB_URI}/${process.env.MONGODB_NAME || 'nomina_app'}?retryWrites=true&w=majority`
await mongoose.connect(uri)
const db = mongoose.connection.db

const legalParams = db.collection('legalparams')
const payrolls = db.collection('payrolls')

// 1) Normalizar porcentajes del período activo (y de todos por si acaso).
const normalize = (value) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return value
  return number > 1 ? number / 100 : number
}

const legalDocs = await legalParams.find({}).toArray()
let fixed = 0
for (const doc of legalDocs) {
  const updates = {}
  if (doc.healthPercentages) {
    const employee = normalize(doc.healthPercentages.employee)
    const employer = normalize(doc.healthPercentages.employer)
    if (employee !== doc.healthPercentages.employee || employer !== doc.healthPercentages.employer) {
      updates['healthPercentages.employee'] = employee
      updates['healthPercentages.employer'] = employer
    }
  }
  if (doc.pensionPercentages) {
    const employee = normalize(doc.pensionPercentages.employee)
    const employer = normalize(doc.pensionPercentages.employer)
    if (employee !== doc.pensionPercentages.employee || employer !== doc.pensionPercentages.employer) {
      updates['pensionPercentages.employee'] = employee
      updates['pensionPercentages.employer'] = employer
    }
  }
  if (Object.keys(updates).length > 0) {
    await legalParams.updateOne({ _id: doc._id }, { $set: updates })
    console.log(`parámetros ${doc._id}: ${JSON.stringify(updates)}`)
    fixed++
  }
}
console.log(`períodos de parámetros corregidos: ${fixed}`)

// 2) Eliminar nóminas demo de la ventana de 4 meses (periodo estándar +
//    períodos mal cortados tipo 01-MM → 01-MM+1 y cualquier período dentro).
const today = new Date()
const lastMonth = new Date(today.getFullYear(), today.getMonth(), 1)
const firstMonth = new Date(today.getFullYear(), today.getMonth() - 3, 1)

const result = await payrolls.deleteMany({
  periodStart: { $gte: firstMonth },
  periodEnd: { $lte: new Date(today.getFullYear(), today.getMonth() + 1, 1) },
})
console.log(`nóminas demo eliminadas (ventana ${firstMonth.toISOString().slice(0, 10)} – ${lastMonth.toISOString().slice(0, 10)}): ${result.deletedCount}`)

await mongoose.disconnect()
console.log('')
console.log('Siguiente paso: node scripts/seed-demo-payroll-month.mjs')
