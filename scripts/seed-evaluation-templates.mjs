#!/usr/bin/env node
/**
 * Seed de evaluación de desempeño (módulo configurable).
 *
 * - Crea una plantilla activa por cargo (base o con liderazgo según el cargo).
 * - Crea evaluaciones demo para algunos empleados (período "2026 – Semestre 1").
 *
 * Idempotente: la plantilla se reemplaza por cargo y las evaluaciones demo
 * se eliminan y recrean para el mismo período.
 *
 * Uso:
 *   node scripts/seed-evaluation-templates.mjs
 */
import 'dotenv/config'
import mongoose from 'mongoose'

const uri = `${process.env.MONGODB_URI}/${process.env.MONGODB_NAME || 'nomina_app'}?retryWrites=true&w=majority`
await mongoose.connect(uri)
const db = mongoose.connection.db

const companies = db.collection('companies')
const positions = db.collection('positions')
const users = db.collection('users')
const employees = db.collection('employees')
const templates = db.collection('evaluationtemplates')
const evaluations = db.collection('evaluations')
const tenantConfigs = db.collection('tenantconfigs')

const company = await companies.findOne({ active: true })
if (!company) {
  console.error('No hay empresa activa. Configura primero la empresa.')
  await mongoose.disconnect()
  process.exit(1)
}
const admin = await users.findOne({ role: 'admin', active: true })
const now = new Date()

// Logo de prueba para la empresa demo (encabezado del PDF).
await companies.updateOne(
  { _id: company._id },
  { $set: { logo: '/images/logo-empresa-demo.png', updatedAt: now } },
)

// Activa el módulo de evaluaciones en la configuración del tenant.
await tenantConfigs.updateOne(
  { tenantId: company._id },
  { $addToSet: { enabledFlags: 'performance' } },
  { upsert: true },
)

// --------------------------------------------------------- estructuras
const baseSections = [
  {
    id: 'desempeno',
    title: 'Desempeño en el rol',
    description: 'Cumplimiento de las funciones propias del cargo.',
    order: 0,
    weight: 40,
    items: [
      { id: 'desempeno_1', description: 'Cumplimiento de las funciones asignadas', order: 0 },
      { id: 'desempeno_2', description: 'Calidad y precisión del trabajo', order: 1 },
      { id: 'desempeno_3', description: 'Productividad y uso del tiempo', order: 2 },
      { id: 'desempeno_4', description: 'Responsabilidad y compromiso', order: 3 },
    ],
  },
  {
    id: 'competencias',
    title: 'Competencias clave',
    description: 'Comportamientos esperados en el trabajo diario.',
    order: 1,
    weight: 30,
    items: [
      { id: 'competencias_1', description: 'Trabajo en equipo y colaboración', order: 0 },
      { id: 'competencias_2', description: 'Comunicación efectiva', order: 1 },
      { id: 'competencias_3', description: 'Adaptabilidad al cambio', order: 2 },
      { id: 'competencias_4', description: 'Orientación a resultados', order: 3 },
    ],
  },
  {
    id: 'resultados',
    title: 'Resultados del período',
    description: 'Logros y aportes medibles del período evaluado.',
    order: 2,
    weight: 30,
    items: [
      { id: 'resultados_1', description: 'Cumplimiento de metas del período', order: 0 },
      { id: 'resultados_2', description: 'Iniciativa y mejora continua', order: 1 },
      { id: 'resultados_3', description: 'Uso eficiente de recursos', order: 2 },
    ],
  },
]

const managerSections = [
  {
    id: 'desempeno',
    title: 'Desempeño en el rol',
    description: 'Cumplimiento de las funciones propias del cargo.',
    order: 0,
    weight: 30,
    items: baseSections[0].items,
  },
  {
    id: 'liderazgo',
    title: 'Liderazgo y gestión de equipo',
    description: 'Habilidades de dirección, desarrollo y seguimiento del equipo.',
    order: 1,
    weight: 20,
    items: [
      { id: 'liderazgo_1', description: 'Dirección y coordinación del equipo', order: 0 },
      { id: 'liderazgo_2', description: 'Comunicación de metas y retroalimentación', order: 1 },
      { id: 'liderazgo_3', description: 'Desarrollo y motivación de colaboradores', order: 2 },
      { id: 'liderazgo_4', description: 'Toma de decisiones y resolución de conflictos', order: 3 },
    ],
  },
  {
    id: 'competencias',
    title: 'Competencias clave',
    description: 'Comportamientos esperados en el trabajo diario.',
    order: 2,
    weight: 20,
    items: baseSections[1].items,
  },
  {
    id: 'resultados',
    title: 'Resultados del período',
    description: 'Logros y aportes medibles del período evaluado.',
    order: 3,
    weight: 30,
    items: baseSections[2].items,
  },
]

const isManagerPosition = (title) =>
  /supervisor|líder|director|coordinador/i.test(title)

// --------------------------------------------------------- plantillas
const allPositions = await positions.find({ tenantId: company._id }).toArray()
const templateByPosition = new Map()
let templateCount = 0
for (const position of allPositions) {
  const sections = isManagerPosition(position.title)
    ? managerSections
    : baseSections
  await templates.updateOne(
    { tenantId: company._id, positionId: position._id },
    {
      $set: {
        name: `Evaluación — ${position.title}`,
        description: `Plantilla de evaluación de desempeño para ${position.title}.`,
        positionId: position._id,
        sections,
        active: true,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now, createdBy: admin?._id ?? null },
    },
    { upsert: true },
  )
  const saved = await templates.findOne({
    tenantId: company._id,
    positionId: position._id,
  })
  templateByPosition.set(String(position._id), saved?._id ?? null)
  templateCount++
}
console.log(`Plantillas creadas/actualizadas: ${templateCount}`)

// --------------------------------------------------- evaluaciones demo
const PERIOD_LABEL = '2026 – Semestre 1 (demo)'
const demoEmployees = await employees
  .find({
    tenantId: company._id,
    active: true,
    document: { $in: ['1000000001', '1000000005', '1000000006'] },
  })
  .toArray()

const computeScore = (sections) => {
  let total = 0
  for (const section of sections) {
    const scores = (section.items ?? [])
      .map((item) => item.score)
      .filter((score) => typeof score === 'number')
    if (scores.length === 0) continue
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length
    total += (average / 5) * (section.sectionWeight ?? 0)
  }
  return Math.round(total * 100) / 100
}

const seedEvaluation = (employee, position, status) => {
  const templateSections = isManagerPosition(position.title)
    ? managerSections
    : baseSections
  const sections = templateSections.map((section) => ({
    sectionId: section.id,
    sectionTitle: section.title,
    sectionWeight: section.weight,
    items: section.items.map((item) => ({
      itemId: item.id,
      description: item.description,
      score: 3 + ((item.order + employee.document.slice(-1)) % 3), // 3-5
    })),
  }))
  return {
    tenantId: company._id,
    employee: employee._id,
    evaluator: admin?._id ?? null,
    periodLabel: PERIOD_LABEL,
    templateId: templateByPosition.get(String(position._id)) ?? null,
    positionId: position._id,
    status,
    sections,
    recommendations:
      'Mantener el buen desempeño y reforzar la comunicación con el equipo.',
    actionPlan:
      'Revisar avances en la siguiente reunión de seguimiento y definir una meta de mejora.',
    overallScore: computeScore(sections),
    approvedBy: status === 'approved' ? admin?._id ?? null : null,
    approvedAt: status === 'approved' ? now : null,
    createdAt: now,
    updatedAt: now,
  }
}

let evaluationCount = 0
for (const employee of demoEmployees) {
  const position = allPositions.find((item) => item.title === employee.position)
  if (!position) continue

  await evaluations.deleteMany({
    tenantId: company._id,
    employee: employee._id,
    periodLabel: PERIOD_LABEL,
  })

  const status = employee.document === '1000000006' ? 'approved' : 'completed'
  await evaluations.insertOne(seedEvaluation(employee, position, status))
  evaluationCount++
  console.log(
    `Evaluación demo: ${employee.firstName} ${employee.lastName} (${status})`,
  )
}
console.log(`Evaluaciones demo: ${evaluationCount}`)

await mongoose.disconnect()
console.log('Seed de evaluación listo.')
