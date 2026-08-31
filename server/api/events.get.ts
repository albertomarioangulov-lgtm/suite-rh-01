import { alertBus } from '~~/server/utils/alert-stream'
import { Alert } from '~~/server/models/Alert'
import { getTenantId } from '~~/server/utils/tenant'

/**
 * SSE de alertas en tiempo real.
 * - Al conectar, reenvía las alertas activas (sin leer) de la empresa.
 * - Luego transmite cada alerta nueva emitida por el broadcaster
 *   (ej. superar el límite legal de horas extras).
 */
export default defineEventHandler(async (event) => {
  const stream = createEventStream(event)

  // Replay de alertas activas al conectar.
  try {
    const tenantId = await getTenantId(event)
    if (tenantId) {
      const alerts = await Alert.find({ tenantId, read: false })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
      for (const alert of alerts) {
        stream.push({
          event: 'alert',
          data: {
            _id: String(alert._id),
            employee: String(alert.employee ?? ''),
            module: alert.module,
            type: alert.type,
            message: alert.message,
            read: alert.read,
            count: alert.count ?? 1,
            createdAt: alert.createdAt,
          },
        })
      }
    }
  } catch {
    // Sin empresa configurada: se omite el replay.
  }

  const onAlert = (alert: Record<string, unknown>) => {
    stream.push({ event: 'alert', data: alert })
  }
  alertBus.on('alert:new', onAlert)

  const interval = setInterval(() => {
    stream.push({ event: 'ping', data: new Date().toISOString() })
  }, 30_000)

  stream.onClosed(() => {
    clearInterval(interval)
    alertBus.off('alert:new', onAlert)
  })
  return stream.send()
})
