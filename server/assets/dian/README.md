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
> pasa validación estricta. Nuestro generador omite el bloque (es opcional) y el XML
> resultante sí valida; cuando se implemente la firma XAdES (M4) se poblará con la
> extensión de firma.
