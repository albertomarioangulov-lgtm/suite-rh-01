#!/usr/bin/env node
/**
 * Importa empleados de una sede desde un archivo TSV (columnas:
 * CC | NOMBRE | SEXO | CARGO), como los listados que entrega el cliente.
 *
 * - Crea la sede si no existe (usa SEDE_NAME; si la empresa no tiene sedes,
 *   la primera queda como principal).
 * - Upsert por (tenantId, documento): si el empleado ya existe, actualiza
 *   sede/cargo sin duplicar.
 * - Documento: se normaliza (solo dígitos) y se asume CC (TipoDocumento 13).
 * - Salario base: opcional (default 0) mientras el módulo de Nómina no esté
 *   activo; usa BASE_SALARY cuando el cliente vaya a liquidar nómina.
 *   Contrato: CONTRACT_TYPE (default indefinite).
 *
 * Uso:
 *   BASE_SALARY=1500000 node scripts/import-employees-sede.mjs
 *   DRY_RUN=1 node scripts/import-employees-sede.mjs            # solo vista previa
 *   SEDE_NAME="Barranquilla" node scripts/import-employees-sede.mjs \
 *     scripts/data/empleados-sede-barranquilla.tsv
 *
 * Requiere MONGODB_URI/MONGODB_NAME apuntando a la BD del cliente.
 */
import 'dotenv/config'
import fs from 'node:fs'
import mongoose from 'mongoose'

const TSV_PATH = process.argv[2] ?? 'scripts/data/empleados-sede-barranquilla.tsv'
const SEDE_NAME = process.env.SEDE_NAME || 'Barranquilla'
const BASE_SALARY = Number(process.env.BASE_SALARY || 0)
const CONTRACT_TYPE = process.env.CONTRACT_TYPE || 'indefinite'
const HIRE_DATE = process.env.HIRE_DATE
  ? new Date(`${process.env.HIRE_DATE}T00:00:00Z`)
  : new Date()

if (!['indefinite', 'fixed', 'work_labor', 'intern'].includes(CONTRACT_TYPE)) {
  console.error('CONTRACT_TYPE inválido. Usa: indefinite | fixed | work_labor | intern')
  process.exit(1)
}

const readRows = () => {
  const lines = fs.readFileSync(TSV_PATH, 'utf-8').split(/\r?\n/)
  const rows = []
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue
    const parts = line.split('\t')
    if (parts.length < 4) continue
    const [doc, fullName, , cargo] = parts.map((part) => part.trim())
    const document = String(doc ?? '').replace(/\D/g, '')
    if (!document || !fullName) continue
    rows.push({ document, fullName, cargo: cargo || '' })
  }
  return rows
}

const splitName = (fullName) => {
  const tokens = fullName.split(/\s+/).filter(Boolean)
  if (tokens.length <= 2) {
    return {
      firstName: tokens[0] ?? '',
      lastName: tokens.slice(1).join(' ') ?? '',
    }
  }
  // Convención: apellidos = últimos 2 tokens; nombres = el resto.
  return {
    firstName: tokens.slice(0, -2).join(' '),
    lastName: tokens.slice(-2).join(' '),
  }
}

const cargoTitle = (cargo) => {
  const dash = cargo.indexOf('-')
  const title = dash >= 0 ? cargo.slice(dash + 1) : cargo
  return title.trim().replace(/\s+/g, ' ')
}

const rows = readRows()
console.log(`Archivo: ${TSV_PATH} · Empleados a procesar: ${rows.length}`)

if (process.env.DRY_RUN === '1') {
  console.log('\nVista previa (primeros 8):')
  for (const row of rows.slice(0, 8)) {
    const { firstName, lastName } = splitName(row.fullName)
    console.log(
      `  ${row.document} | ${firstName} ${lastName} | ${cargoTitle(row.cargo)}`,
    )
  }
  process.exit(0)
}

const uri = `${process.env.MONGODB_URI}/${process.env.MONGODB_NAME || 'nomina_app'}?retryWrites=true&w=majority`
await mongoose.connect(uri)
const db = mongoose.connection.db
const companies = db.collection('companies')
const sites = db.collection('sites')
const employees = db.collection('employees')

const company = await companies.findOne({ active: true })
if (!company) {
  console.error('No hay empresa activa. Configura primero la empresa.')
  await mongoose.disconnect()
  process.exit(1)
}

// Asegura la sede (la crea si no existe).
let site =
  (await sites.findOne({
    tenantId: company._id,
    $or: [{ name: { $regex: new RegExp(SEDE_NAME, 'i') } }, { code: SEDE_NAME.toUpperCase() }],
  })) ?? null
if (!site) {
  const count = await sites.countDocuments({ tenantId: company._id })
  const now = new Date()
  site = await sites.insertOne({
    tenantId: company._id,
    name: SEDE_NAME,
    code: SEDE_NAME.toUpperCase(),
    city: SEDE_NAME,
    municipalityCode: '',
    address: '',
    phone: '',
    isMain: count === 0,
    active: true,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  })
  console.log(`✔ Sede creada: ${SEDE_NAME}`)
}
console.log(`Sede: ${site.name ?? SEDE_NAME}`)

let created = 0
let updated = 0
let skipped = 0

for (const row of rows) {
  const { firstName, lastName } = splitName(row.fullName)
  const position = cargoTitle(row.cargo)
  const now = new Date()
  const existing = await employees.findOne({
    tenantId: company._id,
    document: row.document,
  })

  if (existing) {
    const changes = {}
    if (String(existing.sedeId ?? '') !== String(site.insertedId ?? site._id)) {
      changes.sedeId = site.insertedId ?? site._id
    }
    if ((existing.position ?? '') !== position) changes.position = position
    if (Object.keys(changes).length) {
      await employees.updateOne(
        { _id: existing._id },
        { $set: { ...changes, updatedAt: now } },
      )
      updated++
    } else {
      skipped++
    }
    continue
  }

  await employees.insertOne({
    tenantId: company._id,
    sedeId: site.insertedId ?? site._id,
    user: null,
    document: row.document,
    documentType: 13,
    firstName,
    lastName,
    // Sin email conocido: se omite la clave para no chocar con el índice
    // único sparse (tenantId + email). El portal se vincula después.
    hireDate: HIRE_DATE,
    contractType: CONTRACT_TYPE,
    employeeType: '01',
    subEmployeeType: '00',
    salarioIntegral: false,
    bankName: '',
    accountType: null,
    accountNumber: '',
    payrollCycle: null,
    tipoContrato: '',
    diaDescanso: 0,
    baseSalary: BASE_SALARY,
    arlRiskClass: 1,
    position,
    department: null,
    manager: null,
    assignedShift: null,
    active: true,
    terminationDate: null,
    terminationReason: '',
    createdAt: now,
    updatedAt: now,
  })
  created++
}

console.log(
  `Importación completa → creados: ${created} · actualizados: ${updated} · sin cambios: ${skipped}`,
)
await mongoose.disconnect()
