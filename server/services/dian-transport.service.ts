/**
 * Transmisión del DSNE al VPFE de la DIAN (operación SendNominaSync).
 *
 * Anexo técnico DSNE v1.0, numeral 9: el servicio WcfDianCustomerServices
 * expone SendNominaSync para transmitir un XML firmado dentro de un .zip
 * (base64) con SOAP 1.2 y WS-Security 1.0 (X.509 Token Profile 1.1), sobre
 * TLS 1.2 con autenticación mutua (certificado digital del cliente).
 *
 * El sobre SOAP se firma con el patrón WCF de DIAN: Timestamp, wsa:To,
 * wsa:Action y el Body (exc-c14n con InclusiveNamespaces "wsa soap wcf").
 */

import { createHash, createSign, randomUUID } from 'node:crypto'
import https from 'node:https'
import { DOMParser, XMLSerializer } from '@xmldom/xmldom'
import { XmlDsigExcC14NTransform } from 'xmldsigjs'
import type { IDianCertificate } from '~~/server/utils/dian-crypto'

const NS_SOAP = 'http://www.w3.org/2003/05/soap-envelope'
const NS_WCF = 'http://wcf.dian.colombia'
const NS_WSA = 'http://www.w3.org/2005/08/addressing'
const NS_WSSE =
  'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd'
const NS_WSU =
  'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd'
const NS_DS = 'http://www.w3.org/2000/09/xmldsig#'
const NS_EC = 'http://www.w3.org/2001/10/xml-exc-c14n#'

const ENCODING_TYPE =
  'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary'
const VALUE_TYPE =
  'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3'
const DIAN_ACTION_BASE = 'http://wcf.dian.colombia/IWcfDianCustomerServices'
const INCLUSIVE_PREFIXES = 'wsa soap wcf'
const TIMESTAMP_TTL_MS = 5 * 60 * 1000

/** Endpoints del VPFE por ambiente: 1 producción, 2 habilitación. */
export const DIAN_ENDPOINTS: Record<1 | 2, string> = {
  1: 'https://vpfe.dian.gov.co/WcfDianCustomerServices.svc',
  2: 'https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc',
}

export const DIAN_ACTIONS = {
  sendNominaSync: `${DIAN_ACTION_BASE}/SendNominaSync`,
  getStatus: `${DIAN_ACTION_BASE}/GetStatus`,
} as const

const sha256Base64 = (input: Buffer | string): string =>
  createHash('sha256').update(input).digest('base64')

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

/** Recoge los namespaces en alcance (prefijo → URI) para un nodo. */
const collectInScopeNamespaces = (
  node: globalThis.Node | null,
): Map<string, string> => {
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

/**
 * Canonicalización exclusiva (exc-c14n) de un elemento con la lista de
 * prefijos inclusivos. Clona el nodo y propaga los namespaces de los
 * ancestros para que el algoritmo vea el mismo contexto que en el documento
 * final (como lo computa un validador conforme a WS-Security).
 */
const canonicalizeExclusive = (
  node: globalThis.Element,
  inclusivePrefixes: string,
): string => {
  const clone = node.cloneNode(true) as globalThis.Element
  for (const [prefix, uri] of collectInScopeNamespaces(node)) {
    const qualified = prefix ? `xmlns:${prefix}` : 'xmlns'
    if (!clone.getAttribute(qualified)) {
      clone.setAttribute(qualified, uri)
    }
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

const toUtcIso = (date: Date): string => date.toISOString()

export interface ISendNominaSyncEnvelope {
  /** SOAP 1.2 firmado listo para POST al VPFE. */
  envelope: string
  /** Valor del header SOAPAction. */
  action: string
  endpointUrl: string
}

export const buildSendNominaSyncEnvelope = (
  zipBase64: string,
  certificate: IDianCertificate,
  options: { endpointUrl?: string; signingTime?: Date } = {},
): ISendNominaSyncEnvelope => {
  const endpointUrl =
    options.endpointUrl ?? DIAN_ENDPOINTS[2]
  const action = DIAN_ACTIONS.sendNominaSync
  const now = options.signingTime ?? new Date()
  const expires = new Date(now.getTime() + TIMESTAMP_TTL_MS)

  const tsId = `TS-${randomUUID()}`
  const x509Id = `X509-${randomUUID()}`
  const sigId = `SIG-${randomUUID()}`
  const kiId = `KI-${randomUUID()}`
  const strId = `STR-${randomUUID()}`
  const toId = `To-${randomUUID()}`
  const actionId = `Action-${randomUUID()}`
  const bodyId = `Body-${randomUUID()}`

  const security = `<wsse:Security xmlns:wsse="${NS_WSSE}" xmlns:wsu="${NS_WSU}" soap:mustUnderstand="1">
  <wsu:Timestamp wsu:Id="${tsId}">
    <wsu:Created>${toUtcIso(now)}</wsu:Created>
    <wsu:Expires>${toUtcIso(expires)}</wsu:Expires>
  </wsu:Timestamp>
  <wsse:BinarySecurityToken EncodingType="${ENCODING_TYPE}" ValueType="${VALUE_TYPE}" wsu:Id="${x509Id}">${
    certificate.certificates[0]?.derBase64 ?? ''
  }</wsse:BinarySecurityToken>
  <ds:Signature xmlns:ds="${NS_DS}" Id="${sigId}">
    <ds:SignedInfo>__SIGNED_INFO__</ds:SignedInfo>
    <ds:SignatureValue>__SIGNATURE_VALUE__</ds:SignatureValue>
    <ds:KeyInfo Id="${kiId}">
      <wsse:SecurityTokenReference wsu:Id="${strId}">
        <wsse:Reference URI="#${x509Id}" ValueType="${VALUE_TYPE}"/>
      </wsse:SecurityTokenReference>
    </ds:KeyInfo>
  </ds:Signature>
</wsse:Security>`

  const header = `<soap:Header xmlns:wsa="${NS_WSA}">
  ${security}
  <wsa:Action wsu:Id="${actionId}" xmlns:wsu="${NS_WSU}">${action}</wsa:Action>
  <wsa:To wsu:Id="${toId}" xmlns:wsu="${NS_WSU}">${escapeXml(endpointUrl)}</wsa:To>
</soap:Header>`

  const body = `<soap:Body wsu:Id="${bodyId}" xmlns:wsu="${NS_WSU}">
  <wcf:SendNominaSync xmlns:wcf="${NS_WCF}">
    <wcf:contentFile>${zipBase64}</wcf:contentFile>
  </wcf:SendNominaSync>
</soap:Body>`

  const envelopeTemplate = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="${NS_SOAP}">
${header}
${body}
</soap:Envelope>`

  // 1) Parsa el sobre con SignedInfo provisional y calcula los digests de
  //    las cuatro referencias firmadas (Timestamp, To, Action, Body).
  const doc = new DOMParser().parseFromString(envelopeTemplate, 'text/xml')
  const timestampNode = findDescendant(doc, 'Timestamp')
  const toNode = findDescendant(doc, 'To')
  const actionNode = findDescendant(doc, 'Action')
  const bodyNode = findDescendant(doc, 'Body')
  if (!timestampNode || !toNode || !actionNode || !bodyNode) {
    throw new Error(
      'Transmisión DIAN: no se pudo construir el sobre SOAP (faltan elementos firmables).',
    )
  }

  const digestTimestamp = sha256Base64(
    canonicalizeExclusive(timestampNode, ''),
  )
  const digestTo = sha256Base64(canonicalizeExclusive(toNode, INCLUSIVE_PREFIXES))
  const digestAction = sha256Base64(
    canonicalizeExclusive(actionNode, INCLUSIVE_PREFIXES),
  )
  const digestBody = sha256Base64(
    canonicalizeExclusive(bodyNode, INCLUSIVE_PREFIXES),
  )

  const reference = (
    id: string,
    uri: string,
    digest: string,
    prefixList = INCLUSIVE_PREFIXES,
  ): string =>
    `<ds:Reference URI="#${id}"><ds:Transforms><ds:Transform Algorithm="${NS_EC}"><ec:InclusiveNamespaces PrefixList="${prefixList}" xmlns:ec="${NS_EC}"/></ds:Transform></ds:Transforms><ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><ds:DigestValue>${digest}</ds:DigestValue></ds:Reference>`

  const signedInfoXml = `<ds:SignedInfo xmlns:ds="${NS_DS}"><ds:CanonicalizationMethod Algorithm="${NS_EC}"><ec:InclusiveNamespaces PrefixList="${INCLUSIVE_PREFIXES}" xmlns:ec="${NS_EC}"/></ds:CanonicalizationMethod><ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>${reference(
    tsId,
    tsId,
    digestTimestamp,
    '',
  )}${reference(toId, toId, digestTo)}${reference(
    actionId,
    actionId,
    digestAction,
  )}${reference(bodyId, bodyId, digestBody)}</ds:SignedInfo>`

  // 2) Reemplaza el SignedInfo provisional, canonicaliza y firma.
  const envelopeXml = envelopeTemplate.replace(
    '<ds:SignedInfo>__SIGNED_INFO__</ds:SignedInfo>',
    signedInfoXml,
  )
  const finalDoc = new DOMParser().parseFromString(envelopeXml, 'text/xml')
  const signedInfoNode = findDescendant(finalDoc, 'SignedInfo')
  const signatureValueNode = findDescendant(finalDoc, 'SignatureValue')
  if (!signedInfoNode || !signatureValueNode) {
    throw new Error(
      'Transmisión DIAN: no se pudo construir ds:SignedInfo del sobre SOAP.',
    )
  }

  const canonicalSignedInfo = canonicalizeExclusive(
    signedInfoNode,
    INCLUSIVE_PREFIXES,
  )
  const signer = createSign('RSA-SHA256')
  signer.update(canonicalSignedInfo, 'utf8')
  signatureValueNode.textContent = signer
    .sign(certificate.privateKeyPem, 'base64')

  const envelope = new XMLSerializer().serializeToString(finalDoc)
  return { envelope, action, endpointUrl }
}

/**
 * Envía el sobre SOAP al VPFE con TLS mutuo (certificado digital del
 * cliente). Devuelve el XML crudo de la respuesta.
 */
export const sendSoapRequest = (
  envelope: string,
  options: { endpointUrl: string; action: string; certificate: IDianCertificate },
): Promise<string> =>
  new Promise((resolve, reject) => {
    const { endpointUrl, action, certificate } = options
    const agent = new https.Agent({
      key: certificate.privateKeyPem,
      cert: certificate.certificates.map((item) => item.pem),
      rejectUnauthorized: true,
    })
    const request = https.request(
      endpointUrl,
      {
        method: 'POST',
        agent,
        headers: {
          'content-type': 'application/soap+xml; charset=utf-8',
          soapaction: `"${action}"`,
        },
      },
      (response) => {
        const chunks: Buffer[] = []
        response.on('data', (chunk: Buffer) => chunks.push(chunk))
        response.on('end', () => {
          resolve(Buffer.concat(chunks).toString('utf-8'))
        })
      },
    )
    request.on('error', (error) =>
      reject(
        new Error(
          `No se pudo conectar con el VPFE de la DIAN (${endpointUrl}): ${error.message}`,
        ),
      ),
    )
    request.write(envelope, 'utf-8')
    request.end()
  })

export interface IDianTransmissionResult {
  isValid: boolean
  statusCode: string
  statusDescription: string
  statusMessage: string
  errors: string[]
  xmlDocumentKey: string
  xmlFileName: string
  applicationResponseXml?: string
}

/**
 * Parsea la respuesta SOAP de SendNominaSync/GetStatus (formato
 * SendNominaSyncResult / GetStatusResult del anexo, numerales 9.7.2 y 9.8.2).
 */
export const parseSendNominaSyncResponse = (
  soapXml: string,
): IDianTransmissionResult => {
  const doc = new DOMParser().parseFromString(soapXml, 'text/xml')
  const textOf = (localName: string): string => {
    const node = findDescendant(doc, localName)
    return node?.textContent?.trim() ?? ''
  }
  const errors: string[] = []
  const collectStrings = (node: globalThis.Node): void => {
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 1) {
        if (
          (child as globalThis.Element).localName === 'string' &&
          (child as globalThis.Element).textContent
        ) {
          errors.push((child as globalThis.Element).textContent!.trim())
        }
        collectStrings(child)
      }
    }
  }
  collectStrings(doc)

  const base64 = textOf('XmlBase64Bytes')
  let applicationResponseXml: string | undefined
  try {
    applicationResponseXml = base64
      ? Buffer.from(base64, 'base64').toString('utf-8')
      : undefined
  } catch {
    applicationResponseXml = undefined
  }

  return {
    isValid: textOf('IsValid').toLowerCase() === 'true',
    statusCode: textOf('StatusCode'),
    statusDescription: textOf('StatusDescription'),
    statusMessage: textOf('StatusMessage'),
    errors,
    xmlDocumentKey: textOf('XmlDocumentKey'),
    xmlFileName: textOf('XmlFileName'),
    applicationResponseXml,
  }
}

/** Nombre del ZIP según el anexo (numeral 3.5): z + NIT(10) + a + consecutivo(8). */
export const buildDianZipName = (
  nit: string,
  consecutive: number,
): string => {
  const nitDigits = String(nit).replace(/\D/g, '').padStart(10, '0')
  const sequence = String(consecutive).padStart(8, '0')
  return `z${nitDigits}a${sequence}.zip`
}
