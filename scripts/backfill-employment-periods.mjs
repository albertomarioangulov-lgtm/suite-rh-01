#!/usr/bin/env node
/**
 * Migración: crea los períodos de vinculación (EmploymentPeriod) y los
 * contratos iniciales (Contract) de los empleados existentes, a partir de
 * hireDate / terminationDate / contractType / baseSalary / position.
 *
 * Idempotente: no duplica períodos ni contratos.
 *
 * Uso:
 *   node scripts/backfill-employment-periods.mjs
 */
import 'dotenv/config'
import mongoose from 'mongoose'

const uri = `${process.env.MONGODB_URI}/${process.env.MONGODB_NAME || 'nomina_app'}?retryWrites=true&w=majority`
await mongoose.connect(uri)
const db = mongoose.connection.db

const employees = await db.collection('employees').find({}).toArray()
let periodsCreated = 0
let contractsCreated = 0

for (const employee of employees) {
  const existing = await db
    .collection('employmentperiods')
    .findOne({ employee: employee._id })
  if (existing) continue

  const period = {
    tenantId: employee.tenantId ?? employee.company,
    employee: employee._id,
    hireDate: employee.hireDate ?? new Date(),
    terminationDate: employee.terminationDate ?? null,
    terminationReason: employee.terminationReason ?? null,
    status: employee.active === false ? 'terminated' : 'active',
    contract: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  const periodResult = await db.collection('employmentperiods').insertOne(period)
  periodsCreated += 1

  // Contrato inicial (opcional): uno por período.
  const hasContract = await db
    .collection('contracts')
    .findOne({ employmentPeriod: periodResult.insertedId })
  if (hasContract) continue

  await db.collection('contracts').insertOne({
    tenantId: period.tenantId,
    employee: employee._id,
    employmentPeriod: periodResult.insertedId,
    type: employee.contractType ?? 'indefinite',
    startDate: period.hireDate,
    endDate: null,
    salary: employee.baseSalary ?? 0,
    position: employee.position ?? '',
    status: period.status === 'terminated' ? 'terminated' : 'active',
    documentUrl: null,
    renewedFrom: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  contractsCreated += 1
}

console.log(`períodos creados: ${periodsCreated} · contratos creados: ${contractsCreated}`)
await mongoose.disconnect()
