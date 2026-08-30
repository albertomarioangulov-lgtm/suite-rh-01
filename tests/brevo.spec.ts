import { describe, expect, it } from 'vitest'
import { mapBrevoEventToStatus, parseBrevoDate } from '~~/server/utils/brevo'

describe('mapBrevoEventToStatus', () => {
  it('mapea entregado, abierto y clic', () => {
    expect(mapBrevoEventToStatus('delivered')).toBe('delivered')
    expect(mapBrevoEventToStatus('opened')).toBe('opened')
    expect(mapBrevoEventToStatus('uniqueOpened')).toBe('opened')
    expect(mapBrevoEventToStatus('proxy_open')).toBe('opened')
    expect(mapBrevoEventToStatus('click')).toBe('clicked')
  })

  it('mapea rebotes, bloqueos y fallos', () => {
    expect(mapBrevoEventToStatus('hardBounce')).toBe('bounced')
    expect(mapBrevoEventToStatus('softBounce')).toBe('bounced')
    expect(mapBrevoEventToStatus('hard_bounce')).toBe('bounced')
    expect(mapBrevoEventToStatus('soft_bounce')).toBe('bounced')
    expect(mapBrevoEventToStatus('blocked')).toBe('blocked')
    expect(mapBrevoEventToStatus('spam')).toBe('blocked')
    expect(mapBrevoEventToStatus('unsubscribed')).toBe('blocked')
    expect(mapBrevoEventToStatus('invalid')).toBe('invalid')
    expect(mapBrevoEventToStatus('error')).toBe('failed')
  })

  it('mapea sent/request/deferred a pending', () => {
    expect(mapBrevoEventToStatus('sent')).toBe('pending')
    expect(mapBrevoEventToStatus('request')).toBe('pending')
    expect(mapBrevoEventToStatus('deferred')).toBe('pending')
  })

  it('devuelve null para eventos desconocidos (no sobrescribir estado)', () => {
    expect(mapBrevoEventToStatus('otro_evento')).toBeNull()
  })
})

describe('parseBrevoDate', () => {
  it('parsea timestamp Unix en segundos', () => {
    const date = parseBrevoDate(1604933654)
    expect(date?.getTime()).toBe(1604933654 * 1000)
  })

  it('parsea el formato "YYYY-MM-DD HH:mm:ss"', () => {
    const date = parseBrevoDate('2020-10-09 10:30:00')
    expect(date?.getUTCFullYear()).toBe(2020)
    expect(date?.getUTCMonth()).toBe(9)
    expect(date?.getUTCDate()).toBe(9)
  })

  it('devuelve undefined para valores inválidos', () => {
    expect(parseBrevoDate('no-es-fecha')).toBeUndefined()
    expect(parseBrevoDate(undefined)).toBeUndefined()
  })
})
