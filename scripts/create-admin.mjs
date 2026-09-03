#!/usr/bin/env node
/**
 * Crea (o actualiza) el primer usuario administrador de una base.
 *
 * Útil al aprovisionar un nuevo cliente/tenant (Fase 1: base nueva), porque
 * no existe registro público en la app.
 *
 * Uso:
 *   node scripts/create-admin.mjs admin@cliente.com "Nombre Admin" "ClaveSegura123!" [rol]
 *
 * rol: admin (por defecto) | superadmin (cuenta de plataforma/AMAV)
 *
 * Requiere MONGODB_URI y MONGODB_NAME en .env (o variables de entorno) con
 * la base del cliente recién creada.
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcrypt'

const email = process.argv[2] ?? 'admin@cliente.com'
const name = process.argv[3] ?? 'Administrador'
const password = process.argv[4] ?? 'Admin123!'
const role = process.argv[5] ?? 'admin'

if (!['admin', 'superadmin'].includes(role)) {
  console.error('Rol inválido. Usa: admin | superadmin')
  process.exit(1)
}

const uri = `${process.env.MONGODB_URI}/${process.env.MONGODB_NAME || 'nomina_app'}?retryWrites=true&w=majority`
await mongoose.connect(uri)

const users = mongoose.connection.collection('users')
const hash = await bcrypt.hash(password, 10)
await users.updateOne(
  { email },
  {
    $set: {
      name,
      email,
      password: hash,
      role,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
  { upsert: true },
)

console.log(`✔ Admin listo: ${email} (contraseña temporal: ${password})`)
console.log('Cambia la contraseña desde la app tras el primer inicio de sesión.')
await mongoose.disconnect()
