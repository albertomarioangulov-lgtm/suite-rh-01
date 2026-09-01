import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, writeFileSync } from 'node:fs'
import { createHash, createVerify } from 'node:crypto'
import { DOMParser } from '@xmldom/xmldom'
import { XmlDsigC14NTransform } from 'xmldsigjs'
import forge from 'node-forge'
import { buildCenXml } from '~~/server/services/cen.service'
import { signCenXml, wrapWithUBLExtensions } from '~~/server/services/cen-signature.service'
import {
  generateTestP12,
  loadP12Certificate,
} from '~~/server/utils/dian-crypto'

const payload = {
  sequence: 3,
  generationDate: '2026-08-09',
  generationTime: '18:15:00-05:00',
  company: {
    name: 'A & B SAS',
    nit: '900123456',
    address: 'Cra 10 # 20-30',
    municipalityCode: '11001',
  },
  employee: {
    document: '1000000001',
    documentType: 13,
    firstName: 'Ana María',
    lastName: 'Martínez Ruiz',
    bankName: 'Banco Andino',
    accountType: 'ahorros',
    accountNumber: '1234567890',
    hireDate: '2024-03-01',
    contractTypeCode: 1,
    baseSalary: 4000000,
  },
  period: { start: '2026-07-01', end: '2026-07-31' },
  daysWorked: 23,
  tiempoLaborado: 885,
  devengados: {
    baseSalary: 4000000,
    transportAllowance: 249095,
    overtimeDay: 50000,
    overtimeNight: 75000,
    nightSurcharge: 0,
    overtimeDayHours: 2,
    overtimeNightHours: 2,
    nightSurchargeHours: 0,
    bonuses: 0,
    commissions: 0,
    absenceCompanyPaidValue: 0,
    absenceEpsValue: 0,
    absenceArlValue: 0,
    total: 4374095,
  },
  deducciones: {
    employeeHealth: 160000,
    employeePension: 160000,
    sourceRetention: 80000,
    garnishments: 0,
    loans: 50000,
    total: 450000,
  },
  totalToPay: 3924095,
}

describe('wrapWithUBLExtensions', () => {
  it('envuelve la raíz NominaIndividual con el contenedor UBL de extensiones', () => {
    const xml = buildCenXml(payload)
    const wrapped = wrapWithUBLExtensions(xml)
    expect(wrapped.indexOf('<ext:UBLExtensions>')).toBeGreaterThan(
      wrapped.indexOf('<NominaIndividual'),
    )
    expect(wrapped).toContain('<ext:UBLExtension>')
    expect(wrapped).toContain('<ext:ExtensionContent>')
    expect(wrapped.indexOf('<ext:UBLExtensions>')).toBeLessThan(
      wrapped.indexOf('<Novedad'),
    )
    // El marcador interno permite que @xmldom no serialice el elemento vacío
    // autocerrado; `signCenXml` lo reemplaza por la firma.
    expect(wrapped).toContain('__SIGNATURE_PLACEHOLDER__')
  })
})

describe('signCenXml', () => {
  it('genera un DSNE firmado con XAdES-EPES válido (3 referencias, 3 Cert y política DIAN)', () => {
    const p12 = generateTestP12('test-password')
    const certificate = loadP12Certificate(p12, 'test-password')
    expect(certificate.certificates.length).toBeGreaterThanOrEqual(3)

    const xml = buildCenXml(payload)
    const signed = signCenXml({
      xml,
      certificate,
      signingTime: new Date('2026-08-09T18:00:00-05:00'),
      signerRole: 'supplier',
    })

    // Estructura básica de la firma
    expect(signed).toContain('<ds:Signature')
    expect(signed).toContain('ds:SignatureValue>')
    expect(signed).toContain('<xades:QualifyingProperties')
    expect(signed).toContain('<xades:SignedProperties')
    expect(signed).toContain('Id="xmldsig-')
    expect(signed).toContain('URI="#xmldsig-')

    // Política de firma oficial DIAN
    expect(signed).toContain(
      'https://facturaelectronica.dian.gov.co/politicadefirma/v2/politicadefirmav2.pdf',
    )
    expect(signed).toContain(
      'Política de firma para nóminas electrónicas de la República de Colombia.',
    )

    // Rol del firmante
    expect(signed).toContain('<xades:ClaimedRole>supplier</xades:ClaimedRole>')

    // Al menos 3 grupos Cert en SigningCertificate
    const certCount = signed.match(/<xades:Cert>/g)?.length ?? 0
    expect(certCount).toBeGreaterThanOrEqual(3)

    // Al menos 3 certificados en KeyInfo/X509Data
    const x509Count = signed.match(/<ds:X509Certificate>/g)?.length ?? 0
    expect(x509Count).toBeGreaterThanOrEqual(3)

    // 3 referencias en SignedInfo
    const referenceCount = signed.match(/<ds:Reference /g)?.length ?? 0
    expect(referenceCount).toBe(3)

    // No deben quedar placeholders
    expect(signed).not.toContain('__SIGNATURE_VALUE__')
    expect(signed).not.toContain('__KEYINFO_DIGEST__')
    expect(signed).not.toContain('__SIGNEDPROPERTIES_DIGEST__')
  })

  it('acepta el rol thirdparty cuando firma el proveedor tecnológico', () => {
    const p12 = generateTestP12('test-password')
    const certificate = loadP12Certificate(p12, 'test-password')
    const signed = signCenXml({
      xml: buildCenXml(payload),
      certificate,
      signerRole: 'thirdparty',
    })
    expect(signed).toContain('<xades:ClaimedRole>thirdparty</xades:ClaimedRole>')
  })

  it('produce una firma XMLDSig válida: digests de las 3 referencias y RSA', async () => {
    const p12 = generateTestP12('test-password')
    const certificate = loadP12Certificate(p12, 'test-password')
    const signed = signCenXml({
      xml: buildCenXml(payload),
      certificate,
      signingTime: new Date('2026-08-09T18:00:00-05:00'),
    })

    // Verificador XMLDSig independiente: recalcula los digests desde el XML
    // final y verifica la firma RSA sobre el SignedInfo canonicalizado.
    const doc = new DOMParser().parseFromString(signed, 'text/xml')
    const find = (node: globalThis.Node, localName: string): globalThis.Element | null => {
      for (let child = node.firstChild; child; child = child.nextSibling) {
        if (child.nodeType === 1) {
          const element = child as globalThis.Element
          if (element.localName === localName) return element
          const found = find(child, localName)
          if (found) return found
        }
      }
      return null
    }
    const collectNamespaces = (node: globalThis.Node): Map<string, string> => {
      const namespaces = new Map<string, string>()
      let current: globalThis.Node | null = node
      while (current && current.nodeType === 1) {
        const attributes = (current as globalThis.Element).attributes
        for (let i = 0; i < attributes.length; i++) {
          const attribute = attributes.item(i)
          const name = attribute?.nodeName ?? ''
          if (name === 'xmlns') namespaces.set('', attribute.nodeValue ?? '')
          else if (name.startsWith('xmlns:')) {
            namespaces.set(name.slice(6), attribute.nodeValue ?? '')
          }
        }
        current = current.parentNode
      }
      return namespaces
    }
    const canonicalize = (node: globalThis.Element): string => {
      const clone = node.cloneNode(true) as globalThis.Element
      for (const [prefix, uri] of collectNamespaces(node)) {
        const qualified = prefix ? `xmlns:${prefix}` : 'xmlns'
        if (!clone.getAttribute(qualified)) clone.setAttribute(qualified, uri)
      }
      const transform = new XmlDsigC14NTransform()
      transform.LoadInnerXml(clone)
      return transform.GetOutput()
    }
    const digest = (value: string): string =>
      createHash('sha256').update(value, 'utf8').digest('base64')

    const signatureElement = find(doc, 'Signature')!
    const signedInfo = find(signatureElement, 'SignedInfo')!
    const keyInfo = find(signatureElement, 'KeyInfo')!
    const signedProperties = find(signatureElement, 'SignedProperties')!
    const signatureValue = find(signatureElement, 'SignatureValue')!

    // Referencia 0: documento con la firma removida (enveloped)
    const envelopedClone = doc.cloneNode(true) as Document
    const signatureClone = find(envelopedClone, 'Signature')
    signatureClone?.parentNode?.removeChild(signatureClone)
    expect(digest(canonicalize(envelopedClone.documentElement))).toBe(
      find(signedInfo, 'DigestValue')!.textContent,
    )

    // Referencias 1 y 2: KeyInfo y SignedProperties
    const digestValues = signedInfo.getElementsByTagNameNS(
      'http://www.w3.org/2000/09/xmldsig#',
      'DigestValue',
    )
    expect(digestValues.length).toBe(3)
    expect(digest(canonicalize(keyInfo))).toBe(digestValues.item(1)?.textContent)
    expect(digest(canonicalize(signedProperties))).toBe(
      digestValues.item(2)?.textContent,
    )

    // Firma RSA-SHA256 sobre el SignedInfo canonicalizado
    const leafDer = Buffer.from(
      certificate.certificates[0].derBase64,
      'base64',
    )
    const leafCert = forge.pki.certificateFromAsn1(
      forge.asn1.fromDer(forge.util.createBuffer(leafDer.toString('binary'))),
    )
    const verifier = createVerify('RSA-SHA256')
    verifier.update(canonicalize(signedInfo), 'utf8')
    const valid = verifier.verify(
      forge.pki.publicKeyToPem(leafCert.publicKey),
      signatureValue.textContent ?? '',
      'base64',
    )
    expect(valid).toBe(true)
  })

  it('valida contra el XSD oficial de la DIAN (si xmllint está disponible)', () => {
    try {
      execFileSync('which', ['xmllint'])
    } catch {
      return // xmllint no disponible: se omite
    }
    const p12 = generateTestP12('test-password')
    const certificate = loadP12Certificate(p12, 'test-password')
    const signed = signCenXml({
      xml: buildCenXml(payload),
      certificate,
    })
    const dir = '/tmp/suite-rh-cen-xsd'
    mkdirSync(`${dir}/xsd`, { recursive: true })
    cpSync('server/assets/dian/xsd', `${dir}/xsd`, { recursive: true })
    cpSync('server/assets/dian/common', `${dir}/common`, { recursive: true })
    const xmlPath = `${dir}/signed.xml`
    writeFileSync(xmlPath, signed)
    const output = execFileSync('xmllint', [
      '--noout',
      '--schema',
      `${dir}/xsd/NominaIndividualElectronicaXSDV1.0.6.xsd`,
      xmlPath,
    ]).toString()
    expect(output).not.toContain('fails to validate')
  })
})
