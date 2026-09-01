/** Etiquetas de los catálogos DIAN usadas en reportes y exportaciones. */

export const DOCUMENT_TYPE_LABELS: Record<number, string> = {
  11: 'Registro civil',
  12: 'Tarjeta de identidad',
  13: 'Cédula de ciudadanía',
  21: 'Tarjeta de extranjería',
  22: 'Cédula de extranjería',
  31: 'NIT',
  41: 'Pasaporte',
  42: 'Documento de identificación extranjero',
  47: 'PEP',
  50: 'NIT de otro país',
  91: 'NUIP',
}

export const EMPLOYEE_TYPE_LABELS: Record<string, string> = {
  '01': 'Dependiente',
  '02': 'Servicio doméstico',
  '04': 'Madre comunitaria',
  '12': 'Aprendiz del SENA (etapa lectiva)',
  '18': 'Funcionario público sin tope máximo de IBC',
  '19': 'Aprendiz del SENA (etapa productiva)',
  '21': 'Estudiante de posgrado en salud',
  '22': 'Profesor de establecimiento particular',
  '23': 'Estudiante con aportes solo a riesgos laborales',
  '30': 'Dependiente entidad pública con régimen especial en salud',
  '31': 'Cooperado o precooperativa de trabajo asociado',
  '47': 'Dependiente entidad del SGP (aportes patronales)',
  '51': 'Trabajador de tiempo parcial',
  '54': 'Pre pensionado de entidad en liquidación',
  '56': 'Pre pensionado con aporte voluntario a salud',
  '58': 'Estudiante de prácticas laborales en el sector público',
}

export const SUB_EMPLOYEE_TYPE_LABELS: Record<string, string> = {
  '00': 'No aplica',
  '01': 'Dependiente pensionado por vejez activo',
}

export const CONTRACT_TYPE_DIAN_LABELS: Record<number, string> = {
  1: 'Término fijo',
  2: 'Término indefinido',
  3: 'Obra o labor',
  4: 'Aprendizaje',
  5: 'Prácticas o pasantías',
}
