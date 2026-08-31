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
const campaigns = db.collection('evaluationcampaigns')
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

// --------------------------------------------------- campaña demo
const CAMPAIGN_NAME = '2026 – Semestre 1 (demo)'

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

const buildSections = (position, employee) => {
  const templateSections = isManagerPosition(position.title)
    ? managerSections
    : baseSections
  return templateSections.map((section) => ({
    sectionId: section.id,
    sectionTitle: section.title,
    sectionWeight: section.weight,
    items: section.items.map((item) => ({
      itemId: item.id,
      description: item.description,
      score: employee
        ? 3 + ((item.order + employee.document.slice(-1)) % 3) // 3-5
        : null,
    })),
  }))
}

await campaigns.updateOne(
  { tenantId: company._id, name: CAMPAIGN_NAME },
  {
    $set: {
      tenantId: company._id,
      description: 'Campaña demo de evaluación de desempeño (semestre 1).',
      status: 'active',
      startDate: new Date('2026-01-01T12:00:00.000Z'),
      endDate: new Date('2026-06-30T12:00:00.000Z'),
      dueDate: new Date('2026-07-15T12:00:00.000Z'),
      scope: 'all',
      areaIds: [],
      evaluatorRule: 'manager',
      allowSelfEvaluation: false,
      updatedAt: now,
    },
    $setOnInsert: { createdAt: now, createdBy: admin?._id ?? null },
  },
  { upsert: true },
)
const campaign = await campaigns.findOne({
  tenantId: company._id,
  name: CAMPAIGN_NAME,
})

// Genera en borrador para todos los empleados activos con plantilla.
const activeEmployees = await employees
  .find({ tenantId: company._id, active: true })
  .toArray()

const generatedDocs = []
const skipped = []
for (const employee of activeEmployees) {
  const position = allPositions.find((item) => item.title === employee.position)
  if (!position) {
    skipped.push(employee.position)
    continue
  }
  generatedDocs.push({
    tenantId: company._id,
    employee: employee._id,
    evaluator: employee.manager ?? admin?._id ?? null,
    periodLabel: CAMPAIGN_NAME,
    templateId: templateByPosition.get(String(position._id)) ?? null,
    positionId: position._id,
    status: 'draft',
    sections: buildSections(position, null),
    overallScore: 0,
    createdAt: now,
    updatedAt: now,
  })
}

await evaluations.deleteMany({
  tenantId: company._id,
  periodLabel: CAMPAIGN_NAME,
})
if (generatedDocs.length) {
  await evaluations.insertMany(generatedDocs)
}
await campaigns.updateOne(
  { _id: campaign._id },
  { $set: { generatedCount: generatedDocs.length } },
)
console.log(
  `Campaña "${CAMPAIGN_NAME}": ${generatedDocs.length} evaluaciones generadas` +
    (skipped.length ? ` · ${skipped.length} sin plantilla` : ''),
)

// Tres evaluaciones con puntajes (completadas / aprobada) para el dashboard.
const demoDocuments = ['1000000001', '1000000005', '1000000006']
let scored = 0
for (const employee of activeEmployees.filter((item) =>
  demoDocuments.includes(item.document),
)) {
  const position = allPositions.find((item) => item.title === employee.position)
  if (!position) continue
  const status = employee.document === '1000000006' ? 'approved' : 'completed'
  const sections = buildSections(position, employee)
  const result = await evaluations.updateOne(
    {
      tenantId: company._id,
      employee: employee._id,
      periodLabel: CAMPAIGN_NAME,
    },
    {
      $set: {
        status,
        sections,
        overallScore: computeScore(sections),
        recommendations:
          'Mantener el buen desempeño y reforzar la comunicación con el equipo.',
        actionPlan:
          'Revisar avances en la siguiente reunión de seguimiento y definir una meta de mejora.',
        approvedBy: status === 'approved' ? admin?._id ?? null : null,
        approvedAt: status === 'approved' ? now : null,
        updatedAt: now,
      },
    },
  )
  if (result.modifiedCount > 0) {
    scored++
    console.log(
      `Evaluación con puntaje: ${employee.firstName} ${employee.lastName} (${status})`,
    )
  }
}
console.log(`Evaluaciones con puntaje: ${scored}`)

await mongoose.disconnect()
console.log('Seed de evaluación listo.')
