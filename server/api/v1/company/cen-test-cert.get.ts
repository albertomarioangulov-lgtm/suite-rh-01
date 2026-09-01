import { ROLES } from '~~/shared/auth'
import { authorize } from '~~/server/utils/authorize'
import { generateTestP12 } from '~~/server/utils/dian-crypto'

/**
 * Descarga un certificado .p12 de prueba (cadena hoja → AC → raíz autofirmada)
 * para validar el flujo de firma XAdES-EPES en desarrollo/habilitación.
 * NO es válido para producción: la DIAN exige un certificado digital de una
 * entidad de certificación abierta avalada por la ONAC.
 */
export default defineEventHandler(async (event) => {
  await authorize(event, [ROLES.ADMIN])
  const p12 = generateTestP12('suite-rh-test')
  setHeader(
    event,
    'content-type',
    'application/x-pkcs12',
  )
  setHeader(
    event,
    'content-disposition',
    'attachment; filename="suite-rh-certificado-prueba.p12"',
  )
  return p12
})
