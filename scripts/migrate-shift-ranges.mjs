/**
 * Migración: turnos con el modelo viejo (startTime/endTime/breakMinutes)
 * → nuevo modelo con `ranges[]` por día.
 *
 * Uso: node scripts/migrate-shift-ranges.mjs
 */
import 'dotenv/config'
import mongoose from 'mongoose'

const toMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

const hoursBetweenTimes = (start, end) => {
  let diff = (toMinutes(end) - toMinutes(start)) / 60
  if (diff < 0) diff += 24
  return Math.round(diff * 100) / 100
}

const uri = `${process.env.MONGODB_URI}/${process.env.MONGODB_NAME || 'nomina_app'}?retryWrites=true&w=majority`

await mongoose.connect(uri)
const shifts = mongoose.connection.db.collection('shifts')
const docs = await shifts.find({}).toArray()

let migrated = 0

for (const shift of docs) {
  const days = shift.days ?? []
  const newDays = days.map((day) => {
    if (Array.isArray(day.ranges)) return day
    const ranges = [
      {
        startTime: day.startTime,
        endTime: day.endTime,
      },
    ]
    const workHours = Math.round(
      ranges.reduce((acc, range) => acc + hoursBetweenTimes(range.startTime, range.endTime), 0) * 100,
    ) / 100
    return {
      dayOfWeek: day.dayOfWeek,
      ranges,
      workHours,
      active: day.active ?? true,
    }
  })

  if (newDays.some((day, index) => day !== days[index])) {
    await shifts.updateOne({ _id: shift._id }, { $set: { days: newDays } })
    migrated++
  }
}

console.log(`turnos migrados: ${migrated}`)
await mongoose.disconnect()
