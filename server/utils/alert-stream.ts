import { EventEmitter } from 'node:events'

/**
 * Broadcaster de alertas en memoria (SSE).
 * El servicio de asistencia emite `alert:new` cuando crea una alerta y el
 * endpoint `/api/events` reenvía el payload a todos los clientes conectados.
 */
export const alertBus = new EventEmitter()

/** Emite una alerta nueva a los clientes SSE conectados. */
export const publishAlert = (alert: Record<string, unknown>) => {
  alertBus.emit('alert:new', alert)
}
