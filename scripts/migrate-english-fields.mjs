/**
 * Migración: campos de los modelos en español → inglés.
 *
 * - users: nombre→name, rol→role (valores mapeados), activo→active,
 *   fechaCreacion→createdAt (si faltaba).
 * - emaillogs (modelo anterior, un doc por evento): consolida en un solo
 *   documento por email con `history` embebido.
 *
 * Uso: node scripts/migrate-english-fields.mjs
 */
import 'dotenv/config'
import mongoose from 'mongoose'

const ROLE_MAP = {
  admin: 'admin',
  gerente: 'manager',
  rh: 'hr',
  empleado: 'employee',
}

const uri = `${process.env.MONGODB_URI}/${process.env.MONGODB_NAME || 'nomina_app'}?retryWrites=true&w=majority`

await mongoose.connect(uri)
const db = mongoose.connection.db

// ---------- users ----------
const users = db.collection('users')
const userDocs = await users.find({}).toArray()
let migratedUsers = 0

for (const user of userDocs) {
  const set = {}
  const unset = {}

  if (user.nombre !== undefined) {
    set.name = user.nombre
    unset.nombre = ''
  }
  if (user.rol !== undefined) {
    set.role = ROLE_MAP[user.rol] || user.rol
    unset.rol = ''
  }
  if (user.activo !== undefined) {
    set.active = user.activo
    unset.activo = ''
  }
  if (user.fechaCreacion !== undefined) {
    if (!user.createdAt) set.createdAt = user.fechaCreacion
    unset.fechaCreacion = ''
  }

  if (Object.keys(set).length > 0 || Object.keys(unset).length > 0) {
    await users.updateOne({ _id: user._id }, { $set: set, $unset: unset })
    migratedUsers++
  }
}

// ---------- emaillogs (modelo anterior) ----------
const emailLogs = db.collection('emaillogs')
const legacyDocs = await emailLogs.find({ history: { $exists: false } }).toArray()
let consolidated = 0

if (legacyDocs.length > 0) {
  const byEmail = new Map()
  for (const doc of legacyDocs) {
    const entry = {
      status: doc.status || 'pending',
      eventName: doc.eventName,
      messageId: doc.messageId,
      eventAt: doc.eventAt ? new Date(doc.eventAt) : new Date(),
      raw: doc.raw,
    }
    const current = byEmail.get(doc.email) || { history: [], last: null }
    current.history.push(entry)
    if (!current.last || new Date(entry.eventAt) > new Date(current.last)) {
      current.last = entry.eventAt
    }
    byEmail.set(doc.email, current)
  }

  const newDocs = []
  for (const [email, data] of byEmail) {
    const latest = data.history[data.history.length - 1]
    newDocs.push({
      email,
      type: 'invite',
      history: data.history.slice(-100),
      latestStatus: latest?.status || 'pending',
      lastEventAt: data.last,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  await emailLogs.deleteMany({ history: { $exists: false } })
  if (newDocs.length > 0) await emailLogs.insertMany(newDocs)
  consolidated = newDocs.length
}

console.log(`usuarios migrados: ${migratedUsers}`)
console.log(`emaillogs consolidados: ${consolidated}`)
await mongoose.disconnect()
