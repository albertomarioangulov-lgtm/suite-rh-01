/**
 * Utilidades criptográficas para la firma XAdES-EPES del Documento Soporte
 * de Pago de Nómina Electrónica (DSNE).
 *
 * - Carga de certificados PKCS#12 (.p12) con node-forge, extrayendo la clave
 *   privada y toda la cadena de certificación (hoja, AC subordinada y raíz).
 * - Cifrado simétrico (AES-256-GCM) para guardar el .p12 y su contraseña en
 *   la base de datos sin exponerlos en claro.
 * - Generación de un certificado de prueba (cadena de 3 niveles) para el
 *   ambiente de habilitación.
 *
 * Referencia normativa: Resolución 000013 de 2021 de la DIAN, anexo técnico
 * DSNE v1.0, numeral 7 (Política de firma) y numeral 3.6.
 */

import forge from 'node-forge'
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto'
import { X509Certificate } from 'xmldsigjs'

/** Política de firma oficial de la DIAN (la misma para nómina electrónica). */
export const DIAN_POLICY_URL =
  'https://facturaelectronica.dian.gov.co/politicadefirma/v2/politicadefirmav2.pdf'

/** Descripción de la política exigida por el anexo técnico (numeral 7.10). */
export const DIAN_POLICY_DESCRIPTION =
  'Política de firma para nóminas electrónicas de la República de Colombia.'

/** SHA-256 (base64) del PDF oficial `politicadefirmav2.pdf`. */
export const DIAN_POLICY_HASH_BASE64 =
  'dMoMvtcG5aIzgYo0tIsSQeVJBDnUnfSOfBpxXrmor0Y='

export interface IDianCertificate {
  /** Clave privada en PEM (PKCS#1), lista para `node:crypto` createSign. */
  privateKeyPem: string
  /**
   * Cadena de certificación ordenada: certificado del firmante (hoja),
   * AC subordinada y raíz. Cada certificado en DER base64 + PEM + datos
   * del emisor necesarios para `xades:IssuerSerial`.
   */
  certificates: Array<{
    derBase64: string
    pem: string
    /** Emisor en formato RFC 4514 (p. ej. "CN=...,O=...,C=CO"). */
    issuerName: string
    /** Número de serie en decimal (xsd:integer). */
    serialNumber: string
  }>
}

const binaryToBase64 = (binary: string): string =>
  Buffer.from(binary, 'binary').toString('base64')

const derToUint8 = (derBase64: string): Uint8Array =>
  Uint8Array.from(Buffer.from(derBase64, 'base64'))

const DN_SHORT_NAMES: Record<string, string> = {
  commonName: 'CN',
  countryName: 'C',
  organizationName: 'O',
  organizationalUnitName: 'OU',
  organizationalUnit: 'OU',
  stateOrProvinceName: 'ST',
  localityName: 'L',
  emailAddress: 'E',
  serialNumber: 'SERIALNUMBER',
  streetAddress: 'STREET',
  title: 'T',
  surname: 'SN',
  givenName: 'GN',
  initials: 'INITIALS',
  pseudonym: 'PSEUDONYM',
  generationQualifier: 'GENERATIONQUALIFIER',
  distinguishedName: 'DN',
  businessCategory: 'BUSINESSCATEGORY',
  jurisdictionCountryName: 'JURISDICTIONC',
  jurisdictionStateOrProvinceName: 'JURISDICTIONST',
  postalCode: 'POSTALCODE',
}

/**
 * Formatea el DN de un certificado node-forge en formato RFC 4514
 * (p. ej. "CN=Ana, O=Empresa SAS, C=CO"), igual que el emisor que
 * reportan las implementaciones DIAN en `ds:X509IssuerName`.
 */
const formatDistinguishedName = (
  attrs: Array<{ name?: string; value?: string }>,
): string =>
  attrs
    .map((attr) => {
      const key = attr.name ?? ''
      const short = DN_SHORT_NAMES[key] ?? key
      return `${short}=${attr.value ?? ''}`
    })
    .join(', ')

/** Atributos del DN (acepta el array clásico y el objeto de node-forge 1.4). */
const dnAttributes = (
  dn: Array<{ name?: string; value?: string }> | { attributes: Array<{ name?: string; value?: string }> },
): Array<{ name?: string; value?: string }> =>
  Array.isArray(dn) ? dn : (dn.attributes ?? [])

/**
 * Extrae la clave privada y la cadena de certificación de un PKCS#12 (.p12).
 *
 * @param p12Buffer Contenido binario del archivo .p12 (Buffer o base64).
 * @param password  Contraseña del contenedor PKCS#12.
 */
export const loadP12Certificate = (
  p12Buffer: Buffer | string,
  password: string,
): IDianCertificate => {
  const der = typeof p12Buffer === 'string' ? Buffer.from(p12Buffer, 'base64') : p12Buffer
  let p12: forge.pkcs12.Pkcs12Pfx
  try {
    const asn1 = forge.asn1.fromDer(forge.util.createBuffer(der.toString('binary')))
    p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password)
  } catch {
    throw new Error(
      'No se pudo abrir el certificado .p12. Verifica que el archivo no esté dañado y que la contraseña sea correcta.',
    )
  }

  const keyBags = [
    ...(p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
      forge.pki.oids.pkcs8ShroudedKeyBag
    ] ?? []),
    ...(p12.getBags({ bagType: forge.pki.oids.keyBag })[
      forge.pki.oids.keyBag
    ] ?? []),
  ]
  const keyBag = keyBags.find((bag) => bag.key)
  if (!keyBag?.key) {
    throw new Error(
      'El certificado .p12 no contiene una clave privada válida. Solicita el archivo con la clave privada a la entidad certificadora.',
    )
  }
  const privateKey = keyBag.key

  const certBags =
    p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? []
  const certs = certBags
    .map((bag) => bag.cert)
    .filter((cert): cert is forge.pki.Certificate => Boolean(cert))

  if (!certs.length) {
    throw new Error(
      'El certificado .p12 no contiene certificados X.509. El archivo debe incluir el certificado digital y su cadena.',
    )
  }

  // Ordena la cadena: hoja (la que coincide con la clave privada) primero,
  // después AC subordinadas y por último la raíz.
  const publicKeyDer = (
    key: forge.pki.rsa.PublicKey | forge.pki.rsa.PrivateKey,
  ): string =>
    forge.asn1
      .toDer(forge.pki.publicKeyToAsn1(key))
      .getBytes()
  const privatePublicKey: forge.pki.rsa.PublicKey =
    'publicKey' in privateKey && privateKey.publicKey
      ? (privateKey as forge.pki.rsa.PrivateKey & { publicKey: forge.pki.rsa.PublicKey })
          .publicKey
      : forge.pki.rsa.setPublicKey(privateKey.n, privateKey.e)
  const privatePublicKeyDer = publicKeyDer(privatePublicKey)
  const subjectDer = (cert: forge.pki.Certificate): string =>
    forge.asn1.toDer(forge.pki.distinguishedNameToAsn1(cert.subject)).getBytes()
  const issuerDer = (cert: forge.pki.Certificate): string =>
    forge.asn1.toDer(forge.pki.distinguishedNameToAsn1(cert.issuer)).getBytes()

  const ordered: forge.pki.Certificate[] = []
  let current =
    certs.find((cert) => publicKeyDer(cert.publicKey) === privatePublicKeyDer) ??
    certs[0]
  const used = new Set<forge.pki.Certificate>()
  while (current && !used.has(current)) {
    used.add(current)
    ordered.push(current)
    const next = certs.find(
      (cert) =>
        !used.has(cert) &&
        cert !== current &&
        subjectDer(cert) === issuerDer(current),
    )
    current = next as forge.pki.Certificate | undefined
  }
  certs.forEach((cert) => {
    if (!used.has(cert)) ordered.push(cert)
  })

  const certificates = ordered.map((cert) => {
    const derBase64 = binaryToBase64(
      forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes(),
    )
    const x509 = new X509Certificate(derToUint8(derBase64))
    return {
      derBase64,
      pem: forge.pki.certificateToPem(cert),
      issuerName: formatDistinguishedName(dnAttributes(cert.issuer)),
      serialNumber: x509.SerialNumber,
    }
  })

  return {
    privateKeyPem: forge.pki.privateKeyToPem(privateKey),
    certificates,
  }
}

const PEM_HEADER = '-----BEGIN CERTIFICATE-----'
const PEM_FOOTER = '-----END CERTIFICATE-----'

/**
 * Genera un certificado de prueba autocadena (hoja → AC subordinada → raíz)
 * para validar el flujo de firma en desarrollo / ambiente de habilitación.
 * NO es válido para producción: la DIAN exige un certificado digital
 * expedido por una entidad de certificación abierta avalada por la ONAC.
 */
export const generateTestP12 = (
  password = 'suite-rh-test',
  commonName?: string,
): Buffer => {
  const makeCert = (
    commonName: string,
    subject: forge.pki.CertificateField[],
    issuer: forge.pki.CertificateField[],
    issuerKey: forge.pki.rsa.PrivateKey | undefined,
    serial: string,
    isCa: boolean,
  ): { cert: forge.pki.Certificate; key: forge.pki.rsa.PrivateKey } => {
    const { privateKey, publicKey } = forge.pki.rsa.generateKeyPair(2048)
    const cert = forge.pki.createCertificate()
    cert.publicKey = publicKey
    cert.serialNumber = serial
    cert.validity.notBefore = new Date(Date.now() - 24 * 60 * 60 * 1000)
    cert.validity.notAfter = new Date()
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 2)
    cert.setSubject(subject)
    cert.setIssuer(issuer)
    if (isCa) {
      cert.setExtensions([
        { name: 'basicConstraints', cA: true },
        { name: 'keyUsage', digitalSignature: true, keyCertSign: true },
      ])
    } else {
      cert.setExtensions([
        { name: 'basicConstraints', cA: false },
        {
          name: 'keyUsage',
          digitalSignature: true,
          nonRepudiation: true,
        },
      ])
    }
    cert.sign(issuerKey ?? privateKey, forge.md.sha256.create())
    return { cert, key: privateKey }
  }

  const rootName = commonName || 'Suite RH Root CA (Prueba)'
  const root = makeCert(
    rootName,
    [{ name: 'commonName', value: rootName }, { name: 'countryName', value: 'CO' }],
    [{ name: 'commonName', value: rootName }, { name: 'countryName', value: 'CO' }],
    undefined,
    '01',
    true,
  )
  const subName = 'Suite RH AC Subordinada (Prueba)'
  const sub = makeCert(
    subName,
    [{ name: 'commonName', value: subName }, { name: 'countryName', value: 'CO' }],
    root.cert.subject.attributes,
    root.key,
    '02',
    true,
  )
  const leafName = 'Suite RH Certificado de Prueba'
  const leaf = makeCert(
    leafName,
    [
      { name: 'commonName', value: leafName },
      { name: 'countryName', value: 'CO' },
      { name: 'organizationName', value: 'Suite RH (Prueba)' },
    ],
    sub.cert.subject.attributes,
    sub.key,
    '03',
    false,
  )

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
    leaf.key,
    [leaf.cert, sub.cert, root.cert],
    password,
    { algorithm: '3des' },
  )
  return Buffer.from(forge.asn1.toDer(p12Asn1).getBytes(), 'binary')
}

const SECRET_PREFIX = 'v1:'

/** Cifra un secreto (p12 en base64 o contraseña) con AES-256-GCM. */
export const encryptDianSecret = (value: string, secret: string): string => {
  if (!secret) {
    throw new Error(
      'Falta configurar NUXT_DIAN_CERT_SECRET en las variables de entorno para guardar el certificado de forma segura.',
    )
  }
  const key = createHash('sha256').update(secret).digest()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return `${SECRET_PREFIX}${iv.toString('base64')}:${cipher
    .getAuthTag()
    .toString('base64')}:${encrypted.toString('base64')}`
}

/** Descifra un secreto cifrado con {@link encryptDianSecret}. */
export const decryptDianSecret = (payload: string, secret: string): string => {
  if (!payload) return ''
  if (!payload.startsWith(SECRET_PREFIX)) return payload
  const [, ivB64, tagB64, dataB64] = payload.split(':')
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Secreto DIAN almacenado en formato inválido.')
  }
  const key = createHash('sha256').update(secret).digest()
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivB64, 'base64'),
  )
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

/** Devuelve el contenido del certificado sin exponer clave privada. */
export const certificateSummary = (cert: IDianCertificate): string => {
  const leaf = cert.certificates[0]
  return leaf ? `${leaf.issuerName} (serial ${leaf.serialNumber})` : ''
}

export const pemToDerBase64 = (pem: string): string => {
  const body = pem
    .replace(PEM_HEADER, '')
    .replace(PEM_FOOTER, '')
    .replace(/\s/g, '')
  return body
}
