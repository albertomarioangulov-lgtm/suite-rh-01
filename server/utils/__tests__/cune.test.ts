import { describe, expect, it } from 'vitest'
import {
  computeCune,
  computeSoftwareSC,
  trunc2,
} from '~~/server/utils/cune'

describe('computeCune', () => {
  it('calcula el SHA-384 de la composición oficial (numeral 8.1.1.3)', () => {
    const cune = computeCune({
      numero: 'N00001',
      fechaGen: '2020-01-16',
      horaGen: '10:53:10-05:00',
      totalDevengado: 3500000,
      totalDeducciones: 1000000,
      totalPagado: 2500000,
      nit: '700085371',
      documentoEmpleado: '800199436',
      tipoXml: 102,
      softwarePin: '693',
      ambiente: 1,
    })
    // SHA-384 real de la composición correcta. El anexo imprime mal su
    // ejemplo: omite los dos puntos de la hora y el hash publicado no
    // corresponde a ninguna de las dos cadenas.
    expect(cune).toBe(
      'dae35b4dfdf10939502c96278feb97be1af6cd5653bd662ca29b5c9cdf2729464b51d272ba0008586cf153b46f87a2bd',
    )
  })

  it('trunca los montos a dos decimales sin redondear', () => {
    expect(trunc2(1234.567)).toBe('1234.56')
    expect(trunc2(1234.5)).toBe('1234.50')
  })
})

describe('computeSoftwareSC', () => {
  it('calcula SHA-384 de SoftwareID + PIN + Numero', () => {
    const sc = computeSoftwareSC('SW001', '693', 'N00001')
    expect(sc).toMatch(/^[0-9a-f]{96}$/)
    expect(sc).toBe(computeSoftwareSC('SW001', '693', 'N00001'))
  })

  it('devuelve vacío si faltan SoftwareID o PIN', () => {
    expect(computeSoftwareSC('', '693', 'N00001')).toBe('')
    expect(computeSoftwareSC('SW001', '', 'N00001')).toBe('')
  })
})
