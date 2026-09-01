import { describe, expect, it } from 'vitest'
import { createHash, createVerify } from 'node:crypto'
import { DOMParser } from '@xmldom/xmldom'
import { XmlDsigExcC14NTransform } from 'xmldsigjs'
import forge from 'node-forge'
import {
  buildDianZipName,
  buildSendNominaSyncEnvelope,
  parseSendNominaSyncResponse,
} from '~~/server/services/dian-transport.service'
import {
  generateTestP12,
  loadP12Certificate,
} from '~~/server/utils/dian-crypto'

const certificate = loadP12Certificate(generateTestP12('test-password'), 'test-password')

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

const canonicalizeExclusive = (
  node: globalThis.Element,
  inclusivePrefixes: string,
): string => {
  const clone = node.cloneNode(true) as globalThis.Element
  for (const [prefix, uri] of collectNamespaces(node)) {
    const qualified = prefix ? `xmlns:${prefix}` : 'xmlns'
    if (!clone.getAttribute(qualified)) clone.setAttribute(qualified, uri)
  }
  const transform = new XmlDsigExcC14NTransform()
  transform.InclusiveNamespacesPrefixList = inclusivePrefixes
  transform.LoadInnerXml(clone)
  return transform.GetOutput()
}

const findDescendant = (
  node: globalThis.Node,
  localName: string,
): globalThis.Element | null => {
  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (child.nodeType === 1) {
      const element = child as globalThis.Element
      if (element.localName === localName) return element
      const found = findDescendant(child, localName)
      if (found) return found
    }
  }
  return null
}

const digest = (value: string): string =>
  createHash('sha256').update(value, 'utf8').digest('base64')

describe('buildDianZipName', () => {
  it('arma el nombre del ZIP según el anexo (z + NIT + a + consecutivo)', () => {
    expect(buildDianZipName('800197268', 7)).toBe('z0800197268a00000007.zip')
    expect(buildDianZipName('900.123.456', 123)).toBe('z0900123456a00000123.zip')
  })
})

describe('buildSendNominaSyncEnvelope', () => {
  it('construye un sobre SOAP 1.2 con WS-Security y las 4 referencias firmadas', () => {
    const { envelope, action } = buildSendNominaSyncEnvelope(
      'UEtESEVSQU1FTQ==',
      certificate,
      {
        endpointUrl: 'https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc',
        signingTime: new Date('2026-09-01T12:00:00Z'),
      },
    )

    expect(envelope).toContain(
      'xmlns:soap="http://www.w3.org/2003/05/soap-envelope"',
    )
    expect(envelope).toContain('<wcf:SendNominaSync')
    expect(envelope).toContain('<wcf:contentFile>UEtESEVSQU1FTQ==</wcf:contentFile>')
    expect(envelope).toContain('wsse:BinarySecurityToken')
    expect(envelope).toContain('wsu:Timestamp')
    expect(envelope).toContain('wsu:Created>2026-09-01T12:00:00.000Z')
    expect(envelope).toContain('http://wcf.dian.colombia/IWcfDianCustomerServices/SendNominaSync')
    expect(action).toContain('SendNominaSync')

    // 4 referencias: Timestamp, To, Action y Body
    const referenceCount = envelope.match(/<ds:Reference URI="#/g)?.length ?? 0
    expect(referenceCount).toBe(4)
    expect(envelope).not.toContain('__SIGNATURE_VALUE__')
    expect(envelope).not.toContain('__SIGNED_INFO__')
  })

  it('produce digests y firma RSA verificables de forma independiente', () => {
    const { envelope } = buildSendNominaSyncEnvelope('en-base64', certificate, {
      endpointUrl: 'https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc',
    })
    const doc = new DOMParser().parseFromString(envelope, 'text/xml')
    const signedInfo = findDescendant(doc, 'SignedInfo')!
    const signatureValue = findDescendant(doc, 'SignatureValue')!

    const references = (() => {
      const list: globalThis.Element[] = []
      const walk = (node: globalThis.Node): void => {
        for (let child = node.firstChild; child; child = child.nextSibling) {
          if (child.nodeType === 1) {
            if ((child as globalThis.Element).localName === 'Reference') {
              list.push(child as globalThis.Element)
            }
            walk(child)
          }
        }
      }
      walk(signedInfo)
      return list
    })()
    expect(references.length).toBe(4)

    // Verifica cada digest recalculándolo desde el sobre final
    const uriToElement = new Map<string, globalThis.Element>()
    uriToElement.set('Timestamp', findDescendant(doc, 'Timestamp')!)
    uriToElement.set('To', findDescendant(doc, 'To')!)
    uriToElement.set('Action', findDescendant(doc, 'Action')!)
    uriToElement.set('Body', findDescendant(doc, 'Body')!)

    for (const reference of references) {
      const uri = reference.getAttribute('URI') ?? ''
      const embedded = findDescendant(reference, 'DigestValue')?.textContent ?? ''
      const id = uri.replace('#', '')
      const key = id.startsWith('TS-') ? 'Timestamp' : id.split('-')[0]
      const element = uriToElement.get(key)
      expect(element, `elemento para ${uri}`).toBeDefined()
      const prefixList = key === 'Timestamp' ? '' : 'wsa soap wcf'
      expect(digest(canonicalizeExclusive(element, prefixList))).toBe(embedded)
    }

    // Verifica la firma RSA sobre el SignedInfo canonicalizado
    const leafDer = Buffer.from(certificate.certificates[0].derBase64, 'base64')
    const leafCert = forge.pki.certificateFromAsn1(
      forge.asn1.fromDer(forge.util.createBuffer(leafDer.toString('binary'))),
    )
    const verifier = createVerify('RSA-SHA256')
    verifier.update(canonicalizeExclusive(signedInfo, 'wsa soap wcf'), 'utf8')
    expect(
      verifier.verify(
        forge.pki.publicKeyToPem(leafCert.publicKey),
        signatureValue.textContent ?? '',
        'base64',
      ),
    ).toBe(true)
  })
})

describe('parseSendNominaSyncResponse', () => {
  it('parsea una respuesta exitosa del anexo (IsValid, StatusCode, XmlDocumentKey)', () => {
    const soap = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <SendNominaSyncResponse xmlns="http://wcf.dian.colombia">
      <SendNominaSyncResult xmlns:b="http://schemas.datacontract.org/2004/07/DianResponse">
        <b:IsValid>true</b:IsValid>
        <b:StatusCode>00</b:StatusCode>
        <b:StatusDescription>Procesado Correctamente</b:StatusDescription>
        <b:StatusMessage>Documento Nomina 689, ha sido autorizada.</b:StatusMessage>
        <b:XmlBase64Bytes>PD94bWwgdmVyc2lvbj0iMS4wIj8+PEFwcGxpY2F0aW9uUmVzcG9uc2U+PEhlYWRlcj5vazwvSGVhZGVyPjwvQXBwbGljYXRpb25SZXNwb25zZT4=</b:XmlBase64Bytes>
        <b:XmlDocumentKey>660ebb7fdd77b6d67a00448e7afde2959992c53ad1bf14b9a394272c56ee8cc64b75dc08940625e39390a0af3d8d7cb9</b:XmlDocumentKey>
        <b:XmlFileName>Nomina-firmado-SHA256</b:XmlFileName>
      </SendNominaSyncResult>
    </SendNominaSyncResponse>
  </s:Body>
</s:Envelope>`
    const result = parseSendNominaSyncResponse(soap)
    expect(result.isValid).toBe(true)
    expect(result.statusCode).toBe('00')
    expect(result.statusDescription).toBe('Procesado Correctamente')
    expect(result.statusMessage).toContain('autorizada')
    expect(result.xmlDocumentKey).toContain('660ebb7f')
    expect(result.xmlFileName).toBe('Nomina-firmado-SHA256')
    expect(result.applicationResponseXml).toContain('<ApplicationResponse')
    expect(result.errors).toEqual([])
  })

  it('parsea errores de validación (ErrorMessage) con IsValid=false', () => {
    const soap = `<?xml version="1.0"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <GetStatusResponse xmlns="http://wcf.dian.colombia">
      <GetStatusResult xmlns:b="http://schemas.datacontract.org/2004/07/DianResponse">
        <b:ErrorMessage>
          <c:string xmlns:c="http://schemas.microsoft.com/2003/10/Serialization/Arrays">Regla: NIE901, Rechazo: Error al validar regla</c:string>
          <c:string xmlns:c="http://schemas.microsoft.com/2003/10/Serialization/Arrays">Regla: ZB01, Rechazo: Fallo en el schema XML</c:string>
        </b:ErrorMessage>
        <b:IsValid>false</b:IsValid>
        <b:StatusCode>99</b:StatusCode>
        <b:StatusDescription>Validación contiene errores en campos mandatorios.</b:StatusDescription>
        <b:StatusMessage>Documento con errores en campos mandatorios.</b:StatusMessage>
        <b:XmlDocumentKey>clave-123</b:XmlDocumentKey>
      </GetStatusResult>
    </GetStatusResponse>
  </s:Body>
</s:Envelope>`
    const result = parseSendNominaSyncResponse(soap)
    expect(result.isValid).toBe(false)
    expect(result.statusCode).toBe('99')
    expect(result.errors).toHaveLength(2)
    expect(result.errors[0]).toContain('NIE901')
    expect(result.errors[1]).toContain('ZB01')
  })
})
