/**
 * Siembra los parámetros legales vigentes de Colombia 2026.
 * Desactiva los períodos activos previos y crea uno nuevo vigente desde
 * 2026-01-01.
 *
 * Uso: node scripts/seed-legal-params-2026.mjs
 */
import 'dotenv/config'
import mongoose from 'mongoose'

const uri = `${process.env.MONGODB_URI}/${process.env.MONGODB_NAME || 'nomina_app'}?retryWrites=true&w=majority`

await mongoose.connect(uri)
const legalParams = mongoose.connection.db.collection('legalparams')

const now = new Date()
const deactivated = await legalParams.updateMany(
  { active: true },
  { $set: { active: false, validTo: now } },
)

const doc = {
  uvtValue: 52374,
  minimumWage: 1750905,
  transportAllowance: 249095,
  withholdingRates: [
    { from: 0, to: 95, percentage: 0 },
    { from: 95, to: 150, percentage: 19 },
    { from: 150, to: 360, percentage: 24 },
    { from: 360, to: 640, percentage: 33 },
    { from: 640, to: 1000000000, percentage: 39 },
  ],
  healthPercentages: { employee: 0.04, employer: 0.085 },
  pensionPercentages: { employee: 0.04, employer: 0.12 },
  nightSurchargePercentage: 0.35,
  overtimeDayPercentage: 0.25,
  overtimeNightPercentage: 0.75,
  arlRiskClass: 1,
  validFrom: new Date('2026-01-01'),
  validTo: null,
  active: true,
  createdAt: now,
  updatedAt: now,
}

const inserted = await legalParams.insertOne(doc)

console.log(`períodos desactivados: ${deactivated.modifiedCount}`)
console.log(`período 2026 insertado: ${inserted.insertedId}`)
await mongoose.disconnect()
