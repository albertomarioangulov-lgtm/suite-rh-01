import { createHash } from 'node:crypto'

/**
 * CUNE y SoftwareSC del DSNE según el numeral 8.1 y 8.3 del anexo técnico
 * (Resolución 000013 de 2021). Composición oficial del ejemplo 8.1.1.3:
 *   N00001|2020-01-16|10:53:10-05:00|3500000.00|1000000.00|2500000.00|
 *   700085371|800199436|102|693|1
 * Nota sobre el ejemplo del anexo (8.1.1.3): su cadena impresa omite los dos
 * puntos de la hora ("161053:10" en vez de "16" + "10:53:10") y el hash que
 * imprime no corresponde ni a esa cadena ni a la correcta. Este proyecto usa
 * la fórmula oficial (campos tal como están definidos); el vector de prueba
 * es el SHA-384 real de la composición correcta: dae35b4d…
 */

const sha384 = (value: string) =>
  createHash('sha384').update(value, 'utf8').digest('hex')

/** Monto con 2 decimales truncados (no redondeados), sin separadores. */
export const trunc2 = (value?: number) =>
  (Math.trunc((value ?? 0) * 100) / 100).toFixed(2)

const digitsOf = (value: string) => String(value ?? '').replace(/\D/g, '')

export interface ICuneInput {
  numero: string
  fechaGen: string
  horaGen: string
  totalDevengado: number
  totalDeducciones: number
  totalPagado: number
  nit: string
  documentoEmpleado: string
  tipoXml?: number
  softwarePin: string
  ambiente: number
}

/** CUNE del documento (96 caracteres hex). */
export const computeCune = (input: ICuneInput): string => {
  const plain = [
    input.numero,
    input.fechaGen,
    input.horaGen,
    trunc2(input.totalDevengado),
    trunc2(input.totalDeducciones),
    trunc2(input.totalPagado),
    digitsOf(input.nit),
    digitsOf(input.documentoEmpleado),
    String(input.tipoXml ?? 102),
    input.softwarePin,
    String(input.ambiente),
  ].join('')
  return sha384(plain)
}

/** SoftwareSC por documento: SHA-384(SoftwareID + PIN + Numero). */
export const computeSoftwareSC = (
  softwareId: string,
  softwarePin: string,
  numero: string,
): string =>
  softwareId && softwarePin ? sha384(`${softwareId}${softwarePin}${numero}`) : ''
