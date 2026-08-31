#!/usr/bin/env node
/**
 * Importa las plantillas de evaluación de competentia-01 a Suite RH.
 *
 * Lee la base de competentia-01 (`.env` hermano), mapea los cargos por
 * nombre/título y crea/reemplaza la plantilla activa de cada cargo en el
 * tenant activo de Suite RH.
 *
 * Uso:
 *   node scripts/import-evaluation-templates.mjs
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const parseEnv = (text) =>
  Object.fromEntries(
    text
      .split('\n')
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const index = line.indexOf('=')
        return [line.slice(0, index).trim(), line.slice(index + 1).trim()]
      }),
  )

const competentiaEnvPath = path.resolve(__dirname, '../competentia-01/.env')
if (!fs.existsSync(competentiaEnvPath)) {
  console.error(`No se encontró ${competentiaEnvPath}`)
  process.exit(1)
}
const competentiaEnv = parseEnv(fs.readFileSync(competentiaEnvPath, 'utf-8'))

const srcUri = `${competentiaEnv.MONGODB_URI}/${competentiaEnv.MONGODB_NAME || 'competentia'}?retryWrites=true&w=majority`
const dstUri = `${process.env.MONGODB_URI}/${process.env.MONGODB_NAME || 'nomina_app'}?retryWrites=true&w=majority`

const src = await mongoose.createConnection(srcUri).asPromise()
const dst = await mongoose.createConnection(dstUri).asPromise()

const srcTemplates = await src.collection('evaluationtemplates').find({}).toArray()
const srcPositions = await src.collection('positions').find({}).toArray()
const dstPositions = await dst.collection('positions').find({}).toArray()
const company = await dst.collection('companies').findOne({ active: true })

if (!company) {
  console.error('No hay empresa activa en Suite RH.')
  process.exit(1)
}

const srcPositionNames = new Map(
  srcPositions.map((position) => [String(position._id), position.name]),
)
const dstPositionByTitle = new Map(
  dstPositions.map((position) => [String(position.title).toLowerCase(), position]),
)

let imported = 0
let skipped = 0
for (const template of srcTemplates) {
  const positionName = srcPositionNames.get(String(template.positionId))
  if (!positionName) {
    skipped++
    continue
  }
  const dstPosition = dstPositionByTitle.get(String(positionName).toLowerCase())
  if (!dstPosition) {
    console.log(`  cargo no encontrado en Suite RH: ${positionName}`)
    skipped++
    continue
  }

  const now = new Date()
  await dst.collection('evaluationtemplates').updateOne(
    { tenantId: company._id, positionId: dstPosition._id },
    {
      $set: {
        name: template.name,
        description: template.description ?? '',
        positionId: dstPosition._id,
        sections: template.sections ?? [],
        active: true,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now, createdBy: null },
    },
    { upsert: true },
  )
  console.log(`  importada: ${template.name} → ${positionName}`)
  imported++
}

console.log(`\nPlantillas importadas: ${imported} · omitidas: ${skipped}`)
await src.close()
await dst.close()
process.exit(0)
