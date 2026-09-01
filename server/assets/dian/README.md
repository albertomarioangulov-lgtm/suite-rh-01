# Esquemas oficiales DIAN - Nómina Electrónica

Estos archivos provienen de la **Caja de Herramientas de Nómina Electrónica V1.0**
publicada por la DIAN en su sitio oficial.

- Fuente: `https://www.dian.gov.co/impuestos/factura-electronica/Documents/Caja-de-Herramientas-Nomina-Electronica-V1-0.zip`
- Página de documentación: `https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/documentacion-tecnica-soporte-de-pago-nomina-electronica/`
- Descargado el: 2026-09-01

## Contenido

- `xsd/NominaIndividualElectronicaXSDV1.0.6.xsd` - esquema del DSNE (Documento Soporte de Pago de Nómina Electrónica).
- `xsd/NominaIndividualDeAjusteElectronicaXSDV1.0.6.xsd` - esquema del DSNE de ajuste.
- `common/` - esquemas UBL 2.1 requeridos por los XSD anteriores (el esquema principal los importa desde `../common/`). El ZIP de la DIAN omite tres archivos estándar (`UBL-CommonSignatureComponents`, `UBL-SignatureAggregateComponents` y `UBL-SignatureBasicComponents`); se completaron desde el repositorio oficial de OASIS UBL 2.1 (`https://docs.oasis-open.org/ubl/os-UBL-2.1/xsd/common/`).
- `ejemplos/` - XML de ejemplo validados por la DIAN (V1.0.2).

El anexo técnico oficial (Resolución 000013 de 2021) está transcrito en
`docs/dian/anexo-tecnico-dsne-v1.0.md` (el PDF original de ~6.6 MB no se
versiona en el repo; se descarga desde la Caja de Herramientas de la DIAN).

## Validación

Con `xmllint` instalado se puede validar un XML generado contra el esquema oficial:

```bash
xmllint --noout --schema server/assets/dian/xsd/NominaIndividualElectronicaXSDV1.0.6.xsd <archivo.xml>
```

> Nota: la versión publicada del esquema es la V1.0.6 (anexo técnico V1.0). Antes de
> transmitir a producción conviene verificar en el micrositio de la DIAN que no exista
> una versión más reciente de la Caja de Herramientas.

> Curiosidad: el XML de ejemplo publicado por la DIAN incluye `<ext:UBLExtensions>`
> vacío, y el esquema exige al menos un `UBLExtension`, por lo que ese ejemplo no
> pasa validación estricta.

## Firma digital XAdES-EPES (M4)

La firma del DSNE está implementada en `server/services/cen-signature.service.ts`
(numeral 3.6 y sección 7 del anexo técnico):

- El XML se envuelve en `Ext:UBLExtensions > ext:UBLExtension >
  ext:ExtensionContent` y la firma se incrusta en
  `/NominaIndividual/Ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent/ds:Signature`.
- `SignedInfo` con tres referencias: documento (URI="", enveloped), `KeyInfo`
  y `SignedProperties` (`http://uri.etsi.org/01903#SignedProperties`).
- Canonicalización C14N 1.0 (`REC-xml-c14n-20010315`) y firma RSA-SHA256.
- `SignedProperties` con `SigningTime`, `SigningCertificate` (hoja + AC
  subordinada + raíz), `SignaturePolicyIdentifier` (política oficial DIAN:
  `https://facturaelectronica.dian.gov.co/politicadefirma/v2/politicadefirmav2.pdf`)
  y `SignerRole` (`supplier` | `thirdparty`).

El certificado `.p12` (clave privada + cadena) se configura por empresa en
Administración → Configuración y se guarda cifrado con AES-256-GCM usando
`DIAN_CERT_SECRET` (variable de entorno). Sin certificado, el XML se descarga
sin firma (útil mientras el software no esté habilitado); con certificado, los
endpoints `cen.get` / `cen-all.get` devuelven el DSNE firmado. Hay un botón en
la configuración para descargar un `.p12` de prueba (solo desarrollo, la DIAN
exige un certificado de una entidad de certificación abierta avalada por la ONAC).

La firma se verifica en las pruebas con una implementación independiente
(libxml2 C14N + OpenSSL) además de la validación XSD con `xmllint`.
