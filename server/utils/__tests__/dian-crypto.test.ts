import { describe, expect, it } from 'vitest'
import {
  decryptDianSecret,
  encryptDianSecret,
  generateTestP12,
  loadP12Certificate,
} from '~~/server/utils/dian-crypto'

describe('loadP12Certificate', () => {
  it('extrae la clave privada y la cadena ordenada (hoja, AC, raíz)', () => {
    const p12 = generateTestP12('test-password')
    const certificate = loadP12Certificate(p12, 'test-password')
    expect(certificate.privateKeyPem).toContain('BEGIN RSA PRIVATE KEY')
    expect(certificate.certificates.length).toBeGreaterThanOrEqual(3)
    // La hoja debe estar primero y coincidir con la clave privada.
    expect(certificate.certificates[0].issuerName).toContain('Suite RH AC')
    expect(certificate.certificates[0].derBase64.length).toBeGreaterThan(100)
  })

  it('rechaza una contraseña incorrecta', () => {
    const p12 = generateTestP12('test-password')
    expect(() => loadP12Certificate(p12, 'wrong')).toThrow(/contraseña/)
  })
})

describe('encryptDianSecret / decryptDianSecret', () => {
  it('cifra y descifra con AES-256-GCM', () => {
    const secret = 'clave-larga-y-secreta-para-pruebas-1234567890'
    const encrypted = encryptDianSecret('contenido-sensible', secret)
    expect(encrypted).toMatch(/^v1:/)
    expect(encrypted).not.toContain('contenido-sensible')
    expect(decryptDianSecret(encrypted, secret)).toBe('contenido-sensible')
  })

  it('falla al descifrar con un secreto distinto', () => {
    const encrypted = encryptDianSecret('secreto', 'secreto-a')
    expect(() => decryptDianSecret(encrypted, 'secreto-b')).toThrow()
  })

  it('devuelve valores sin cifrar tal cual (compatibilidad)', () => {
    expect(decryptDianSecret('', 'cualquiera')).toBe('')
    expect(decryptDianSecret('texto-plano', 'cualquiera')).toBe('texto-plano')
  })
})
