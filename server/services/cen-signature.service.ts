/**
 * Firma XAdES-EPES del Documento Soporte de Pago de Nómina Electrónica.
 *
 * Implementa el numeral 3.6 y la sección 7 del anexo técnico del DSNE
 * (Resolución 000013 de 2021, versión 1.0):
 *
 * - La firma se incrusta en /NominaIndividual/Ext:UBLExtensions/ext:UBLExtension/
 *   ext:ExtensionContent/ds:Signature (XMLDSig enveloped).
 * - SignedInfo con tres referencias: documento (URI=""), KeyInfo y
 *   SignedProperties (Type http://uri.etsi.org/01903#SignedProperties).
 * - Canonicalización C14N 1.0 (http://www.w3.org/TR/2001/REC-xml-c14n-20010315)
 *   y firma RSA-SHA256 sobre SignedInfo.
 * - SignedProperties con SigningTime, SigningCertificate (al menos tres
 *   grupos Cert: hoja, AC subordinada y raíz), SignaturePolicyIdentifier
 *   (política oficial DIAN) y SignerRole (supplier | thirdparty).
 *
 * El cálculo se hace de forma manual sobre un DOM (@xmldom) para tener
 * control total de los detalles que exige la DIAN (cadena completa de
 * certificados, tres referencias e IDs `xmldsig-{uuid}-*`).
 */

import { createHash, createSign, randomUUID } from 'node:crypto'
import { DOMParser, XMLSerializer } from '@xmldom/xmldom'
import { XmlDsigC14NTransform } from 'xmldsigjs'
import {
  DIAN_POLICY_DESCRIPTION,
  DIAN_POLICY_HASH_BASE64,
  DIAN_POLICY_URL,
  decryptDianSecret,
  loadP12Certificate,
  type IDianCertificate,
} from '~~/server/utils/dian-crypto'

const NS_DS = 'http://www.w3.org/2000/09/xmldsig#'
const NS_XADES = 'http://uri.etsi.org/01903/v1.3.2#'
const NS_EXT =
  'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2'

const ENVELOPED_TRANSFORM = 'http://www.w3.org/2000/09/xmldsig#enveloped-signature'
const C14N_ALGORITHM = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'
const RSA_SHA256 = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256'
const SHA256_DIGEST = 'http://www.w3.org/2001/04/xmlenc#sha256'
const SIGNED_PROPERTIES_TYPE = 'http://uri.etsi.org/01903#SignedProperties'

export type CenSignerRole = 'supplier' | 'thirdparty'

export interface ISignCenXmlOptions {
  /** XML sin firmar generado por `buildCenXml` (raíz NominaIndividual). */
  xml: string
  /** Certificado (clave privada + cadena) extraído del .p12. */
  certificate: IDianCertificate
  /** Fecha/hora de firma (debe ser menor a la fecha del sistema). */
  signingTime?: Date
  /** supplier: firma el empleador; thirdparty: firma el proveedor autorizado. */
  signerRole?: CenSignerRole
  /** SHA-256 en base64 del PDF de la política de firma. */
  policyHashBase64?: string
}

const escapeXml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

/**
 * Envuelve el documento con el contenedor UBL de extensiones
 * (Ext:UBLExtensions > ext:UBLExtension > ext:ExtensionContent) como primer
 * hijo de la raíz, tal como exige el XSD oficial (minOccurs=0) y el XPath
 * de la firma del anexo técnico.
 */
export const wrapWithUBLExtensions = (xml: string): string => {
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  const root = doc.documentElement
  if (!root) {
    throw new Error('El XML del DSNE no tiene elemento raíz.')
  }
  const extensions = doc.createElementNS(NS_EXT, 'ext:UBLExtensions')
  const extension = doc.createElementNS(NS_EXT, 'ext:UBLExtension')
  const content = doc.createElementNS(NS_EXT, 'ext:ExtensionContent')
  // Marcador temporal que se reemplaza por la firma (evita que @xmldom
  // serialice el elemento vacío autocerrado).
  content.appendChild(doc.createTextNode('__SIGNATURE_PLACEHOLDER__'))
  extension.appendChild(content)
  extensions.appendChild(extension)
  root.insertBefore(extensions, root.firstChild)
  return new XMLSerializer().serializeToString(doc)
}

/** Recoge todos los namespaces en alcance para un nodo (prefijo → URI). */
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
 * Canonicalización C14N 1.0 de un elemento/subárbol. Clona el nodo y propaga
 * los namespaces de los ancestros sobre el clon, porque Canonical XML incluye
 * en el eje de namespaces del nodo raíz todos los que están en alcance.
 */
const canonicalizeNode = (node: globalThis.Element): string => {
  const clone = node.cloneNode(true) as globalThis.Element
  for (const [prefix, uri] of collectInScopeNamespaces(node)) {
    const qualified = prefix ? `xmlns:${prefix}` : 'xmlns'
    if (!clone.getAttribute(qualified)) {
      clone.setAttribute(qualified, uri)
    }
  }
  const transform = new XmlDsigC14NTransform()
  transform.LoadInnerXml(clone)
  return transform.GetOutput()
}

const sha256Base64 = (input: Buffer | string): string =>
  createHash('sha256').update(input).digest('base64')

const buildKeyInfoXml = (
  id: string,
  certificate: IDianCertificate,
): string => {
  const x509 = certificate.certificates
    .map((cert) => `<ds:X509Certificate>${cert.derBase64}</ds:X509Certificate>`)
    .join('')
  return `<ds:KeyInfo Id="${id}"><ds:X509Data>${x509}</ds:X509Data></ds:KeyInfo>`
}

const buildSigningCertificateXml = (
  certificate: IDianCertificate,
): string => {
  const certs = certificate.certificates
    .map((cert) => {
      const digest = sha256Base64(Buffer.from(cert.derBase64, 'base64'))
      return `<xades:Cert><xades:CertDigest><ds:DigestMethod Algorithm="${SHA256_DIGEST}"/><ds:DigestValue>${digest}</ds:DigestValue></xades:CertDigest><xades:IssuerSerial><ds:X509IssuerName>${escapeXml(
        cert.issuerName,
      )}</ds:X509IssuerName><ds:X509SerialNumber>${escapeXml(
        cert.serialNumber,
      )}</ds:X509SerialNumber></xades:IssuerSerial></xades:Cert>`
    })
    .join('')
  return `<xades:SigningCertificate>${certs}</xades:SigningCertificate>`
}

const formatSigningTime = (date: Date): string => {
  // Hora legal colombiana (UTC-05:00) con formato xsd:dateTime.
  const local = new Date(date.getTime() - 5 * 60 * 60 * 1000)
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(
    local.getUTCDate(),
  )}T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(
    local.getUTCSeconds(),
  )}-05:00`
}

const buildSignedPropertiesXml = (
  id: string,
  certificate: IDianCertificate,
  signingTime: Date,
  signerRole: CenSignerRole,
  policyHashBase64: string,
): string => {
  return `<xades:SignedProperties Id="${id}"><xades:SignedSignatureProperties><xades:SigningTime>${formatSigningTime(
    signingTime,
  )}</xades:SigningTime>${buildSigningCertificateXml(
    certificate,
  )}<xades:SignaturePolicyIdentifier><xades:SignaturePolicyId><xades:SigPolicyId><xades:Identifier Qualifier="OIDAsURI">${DIAN_POLICY_URL}</xades:Identifier><xades:Description>${escapeXml(
    DIAN_POLICY_DESCRIPTION,
  )}</xades:Description></xades:SigPolicyId><xades:SigPolicyHash><ds:DigestMethod Algorithm="${SHA256_DIGEST}"/><ds:DigestValue>${policyHashBase64}</ds:DigestValue></xades:SigPolicyHash></xades:SignaturePolicyId></xades:SignaturePolicyIdentifier><xades:SignerRole><xades:ClaimedRoles><xades:ClaimedRole>${signerRole}</xades:ClaimedRole></xades:ClaimedRoles></xades:SignerRole></xades:SignedSignatureProperties></xades:SignedProperties>`
}

const buildSignedInfoXml = (
  signatureId: string,
  documentDigest: string,
  keyInfoDigest: string,
  signedPropertiesDigest: string,
): string => {
  return `<ds:SignedInfo><ds:CanonicalizationMethod Algorithm="${C14N_ALGORITHM}"/><ds:SignatureMethod Algorithm="${RSA_SHA256}"/><ds:Reference Id="${signatureId}-ref0" URI=""><ds:Transforms><ds:Transform Algorithm="${ENVELOPED_TRANSFORM}"/></ds:Transforms><ds:DigestMethod Algorithm="${SHA256_DIGEST}"/><ds:DigestValue>${documentDigest}</ds:DigestValue></ds:Reference><ds:Reference URI="#${signatureId}-keyinfo"><ds:DigestMethod Algorithm="${SHA256_DIGEST}"/><ds:DigestValue>${keyInfoDigest}</ds:DigestValue></ds:Reference><ds:Reference Type="${SIGNED_PROPERTIES_TYPE}" URI="#${signatureId}-signedprops"><ds:DigestMethod Algorithm="${SHA256_DIGEST}"/><ds:DigestValue>${signedPropertiesDigest}</ds:DigestValue></ds:Reference></ds:SignedInfo>`
}

/** Busca el primer descendiente por nombre local. */
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

/**
 * Aplica la firma XAdES-EPES al DSNE y devuelve el XML firmado.
 *
 * El documento debe venir de `buildCenXml` (con CUNE/SoftwareSC/QR ya
 * calculados), porque la firma cubre el documento completo y no puede
 * alterarse después.
 */
export const signCenXml = (options: ISignCenXmlOptions): string => {
  const {
    xml,
    certificate,
    signingTime = new Date(Date.now() - 60 * 1000),
    signerRole = 'supplier',
    policyHashBase64 = DIAN_POLICY_HASH_BASE64,
  } = options

  if (!certificate.certificates.length) {
    throw new Error('No hay certificados en el .p12 para firmar el DSNE.')
  }

  const signatureId = `xmldsig-${randomUUID()}`
  const keyInfoId = `${signatureId}-keyinfo`
  const signedPropertiesId = `${signatureId}-signedprops`

  // 1) Envuelve el documento en UBLExtensions y arma la firma con digests
  //    provisionales; después se reemplazan con los valores reales.
  const wrappedXml = wrapWithUBLExtensions(xml)
  const keyInfoXml = buildKeyInfoXml(keyInfoId, certificate)
  const signedPropertiesXml = buildSignedPropertiesXml(
    signedPropertiesId,
    certificate,
    signingTime,
    signerRole,
    policyHashBase64,
  )
  const signedInfoXml = buildSignedInfoXml(
    signatureId,
    '__DOCUMENT_DIGEST__',
    '__KEYINFO_DIGEST__',
    '__SIGNEDPROPERTIES_DIGEST__',
  )
  const signatureXml = `<ds:Signature xmlns:ds="${NS_DS}" xmlns:xades="${NS_XADES}" Id="${signatureId}">${signedInfoXml}<ds:SignatureValue>__SIGNATURE_VALUE__</ds:SignatureValue>${keyInfoXml}<ds:Object><xades:QualifyingProperties Target="#${signatureId}">${signedPropertiesXml}</xades:QualifyingProperties></ds:Object></ds:Signature>`

  const finalXml = wrappedXml.replace(
    '__SIGNATURE_PLACEHOLDER__',
    signatureXml,
  )
  const finalDoc = new DOMParser().parseFromString(finalXml, 'text/xml')

  // 2) Digest del documento aplicando el transform enveloped: clon del
  //    documento final con el elemento ds:Signature removido.
  const envelopedClone = finalDoc.cloneNode(true) as Document
  const signatureInClone = findDescendant(envelopedClone, 'Signature')
  signatureInClone?.parentNode?.removeChild(signatureInClone)
  const documentDigest = sha256Base64(
    canonicalizeNode(envelopedClone.documentElement),
  )

  const keyInfoNode = findDescendant(finalDoc, 'KeyInfo')
  const signedPropertiesNode = findDescendant(finalDoc, 'SignedProperties')
  const signedInfoNode = findDescendant(finalDoc, 'SignedInfo')
  const signatureValueNode = findDescendant(finalDoc, 'SignatureValue')
  if (
    !keyInfoNode ||
    !signedPropertiesNode ||
    !signedInfoNode ||
    !signatureValueNode
  ) {
    throw new Error('Firma del DSNE: no se pudo construir la estructura ds:Signature.')
  }

  // 3) Digests de KeyInfo y SignedProperties (como aparecen en el documento).
  const keyInfoDigest = sha256Base64(canonicalizeNode(keyInfoNode))
  const signedPropertiesDigest = sha256Base64(
    canonicalizeNode(signedPropertiesNode),
  )
  // Reemplaza los tres DigestValue provisionales de SignedInfo.
  const digestNodes: globalThis.Element[] = []
  const collectDigests = (node: globalThis.Node): void => {
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 1) {
        if ((child as globalThis.Element).localName === 'DigestValue') {
          digestNodes.push(child as globalThis.Element)
        }
        collectDigests(child)
      }
    }
  }
  collectDigests(signedInfoNode)
  if (digestNodes.length !== 3) {
    throw new Error(
      `Firma del DSNE: se esperaban 3 DigestValue en SignedInfo y se encontraron ${digestNodes.length}.`,
    )
  }
  digestNodes[0].textContent = documentDigest
  digestNodes[1].textContent = keyInfoDigest
  digestNodes[2].textContent = signedPropertiesDigest

  // 4) Canonicaliza SignedInfo y firma con RSA-SHA256.
  const canonicalSignedInfo = canonicalizeNode(signedInfoNode)
  const signer = createSign('RSA-SHA256')
  signer.update(canonicalSignedInfo, 'utf8')
  signatureValueNode.textContent = signer
    .sign(certificate.privateKeyPem, 'base64')

  return new XMLSerializer().serializeToString(finalDoc)
}

/**
 * Firma el DSNE con el certificado configurado en la empresa. Si la empresa
 * no tiene certificado (o no está cifrado válidamente), devuelve el XML sin
 * firmar para no romper la descarga; el error se reporta cuando la firma
 * falla con un certificado presente.
 */
export const signCenWithCompany = (
  xml: string,
  company: {
    cenCertificateP12?: string
    cenCertificatePassword?: string
    cenSignerRole?: 'supplier' | 'thirdparty'
  },
): { xml: string; signed: boolean } => {
  const encrypted = company.cenCertificateP12
  if (!encrypted) {
    return { xml, signed: false }
  }
  const secret = String(useRuntimeConfig().dianCertSecret || '')
  const p12Base64 = decryptDianSecret(encrypted, secret)
  const password = decryptDianSecret(company.cenCertificatePassword ?? '', secret)
  const certificate = loadP12Certificate(p12Base64, password)
  const signed = signCenXml({
    xml,
    certificate,
    signerRole: company.cenSignerRole ?? 'supplier',
  })
  return { xml: signed, signed: true }
}
