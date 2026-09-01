# Documentación oficial DIAN - Nómina Electrónica (DSNE)

Material de referencia oficial publicado por la DIAN, versionado en el
repositorio para consulta permanente.

## Contenido

- `anexo-tecnico-dsne-v1.0.md` - Transcripción de texto limpia del Anexo
  Técnico "Documento Soporte de Pago de Nómina Electrónica – Versión 1.0"
  (Resolución 000013 de 2021), 269 páginas (0.8 MB, búsqueda por sección).
  Incluye la especificación del CUNE (numeral 8.1), el SoftwareSC (numeral
  8.3), las tablas de códigos (tipo de documento, trabajador, contrato,
  forma/método de pago, etc.) y las reglas de validación (DC01-DC60).

> El PDF oficial con formato original (tablas e imágenes) no se versiona en el
> repositorio para no inflarlo (~6.6 MB). Se descarga desde la Caja de
> Herramientas de Nómina Electrónica de la DIAN cuando se necesita consultar
> el original.

## Fuente

- Caja de Herramientas de Nómina Electrónica V1.0:
  `https://www.dian.gov.co/impuestos/factura-electronica/Documents/Caja-de-Herramientas-Nomina-Electronica-V1-0.zip`
- Micrositio de documentación técnica:
  `https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/documentacion-tecnica-soporte-de-pago-nomina-electronica/`

## Notas técnicas verificadas en este proyecto

- El XSD oficial (V1.0.6), los esquemas UBL 2.1 completados desde OASIS y los
  XML de ejemplo están en `server/assets/dian/`.
- El CUNE es el SHA-384 (hex, 96 caracteres) de la concatenación del numeral
  8.1.1.1. El ejemplo impreso en el anexo (8.1.1.3) tiene dos errores: la
  cadena impresa omite los dos puntos de la hora y el hash publicado no
  corresponde a ninguna de las dos cadenas. La implementación sigue la fórmula
  oficial (campos tal como están definidos) y su vector de prueba es el SHA-384
  real de la composición correcta (`server/utils/__tests__/cune.test.ts`).
- El `SoftwareSC` es por documento: SHA-384(SoftwareID + PIN + Numero), no un
  valor fijo. El PIN del software es privado (no viaja en el XML) y se
  configura en la empresa para el cálculo del CUNE y del SoftwareSC.
- La firma XAdES-EPES (M4) está implementada: el DSNE se envuelve en
  `Ext:UBLExtensions` y se firma con la política oficial de la DIAN
  (`politicadefirmav2.pdf`, SHA-256 `dMoMvtcG5aIzgYo0tIsSQeVJBDnUnfSOfBpxXrmor0Y=`).
  Ver `server/services/cen-signature.service.ts` y `server/assets/dian/README.md`.
