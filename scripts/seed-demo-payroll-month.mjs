#!/usr/bin/env node
/**
 * Seed de demostración: 6 meses completos de HRMS.
 *
 * Genera (idempotente):
 * - Usuarios demo (rol employee, contraseña "Demo123!") + fichas de empleado.
 * - Turnos: diurno ("Turno 1") y tarde.
 * - Asistencias aprobadas de lunes a viernes en los 4 meses, con perfiles
 *   variados: jornada estándar, horas extras, recargo nocturno y ausencias.
 * - Ausencias aprobadas de varios tipos (permiso médico, citación legal,
 *   calamidad, luto, incapacidad común, vacaciones, día de bicicleta,
 *   permiso sin remunerar).
 * - Nóminas: los 5 primeros meses APROBADAS y el último (mes actual) en
 *   BORRADOR, con devengados/deducciones/seguridad social calculados igual
 *   que el servicio de producción.
 * - Áreas y cargos del catálogo organizacional, asignados a cada empleado.
 *
 * Uso:
 *   node scripts/seed-demo-payroll-month.mjs
 *   DEMO_MONTH=7 DEMO_YEAR=2026 node scripts/seed-demo-payroll-month.mjs
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import {
  splitDayNightHours,
  splitOvertimeFromEnd,
} from '../shared/utils/datetime-helpers.ts'
import {
  ABSENCE_TYPES,
  DEFAULT_EMPLOYER_PAID_INCAPACIDAD_DAYS,
  INCAPACIDAD_COMUN_DAILY_PERCENT,
  REMUNERATED_ABSENCE_TYPES,
} from '../shared/absence.ts'
import { ROLES } from '../shared/auth.ts'

const NIGHT_START = '19:00'
const NIGHT_END = '06:00'
const REGULAR_DAILY_HOURS = 8
const NIGHT_SURCHARGE_RATE = 0.35

const round2 = (value) => Math.round(value * 100) / 100
const pad = (value) => String(value).padStart(2, '0')

// Ventana demo: 4 meses terminando en el mes actual (por defecto).
const today = new Date()
const DEMO_YEAR = Number(process.env.DEMO_YEAR) || today.getFullYear()
const DEMO_MONTH = Number(process.env.DEMO_MONTH) || today.getMonth() + 1
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo123!'
const MONTH_COUNT = 6

const uri = `${process.env.MONGODB_URI}/${process.env.MONGODB_NAME || 'nomina_app'}?retryWrites=true&w=majority`
await mongoose.connect(uri)
const db = mongoose.connection.db

const companies = db.collection('companies')
const users = db.collection('users')
const employees = db.collection('employees')
const shifts = db.collection('shifts')
const attendances = db.collection('attendances')
const absences = db.collection('absences')
const payrolls = db.collection('payrolls')

const company = await companies.findOne({ active: true })
if (!company) {
  console.error('No hay empresa activa. Configura primero la empresa.')
  await mongoose.disconnect()
  process.exit(1)
}

const legal = await db.collection('legalparams').findOne({ active: true })
if (!legal) {
  console.error(
    'No hay parámetros legales vigentes. Ejecuta primero: node scripts/seed-legal-params-2026.mjs',
  )
  await mongoose.disconnect()
  process.exit(1)
}

const admin = await users.findOne({ role: ROLES.ADMIN, active: true })
const now = new Date()

// Fechas de los 4 meses (más antiguo → más reciente; el último va en borrador).
const months = []
for (let offset = MONTH_COUNT - 1; offset >= 0; offset -= 1) {
  const base = new Date(DEMO_YEAR, DEMO_MONTH - 1 - offset, 1)
  const year = base.getFullYear()
  const month = base.getMonth() + 1
  const daysInMonth = new Date(year, month, 0).getDate()
  months.push({
    offset,
    year,
    month,
    label: `${year}-${pad(month)}`,
    // Fechas date-only almacenadas a mediodía UTC (igual que la app) para
    // que el período se muestre 01/MM – último/MM sin desfase de zona horaria.
    start: new Date(`${year}-${pad(month)}-01T12:00:00.000Z`),
    end: new Date(`${year}-${pad(month)}-${pad(daysInMonth)}T12:00:00.000Z`),
    status: offset === 0 ? 'draft' : 'approved',
  })
}

console.log(
  `Ventana demo: ${months[months.length - 1].label} (borrador) + ${months[0].label} – ${months[months.length - 2].label} (aprobadas)`,
)

// ------------------------------------------------------------- perfiles
const DAY = 'day'
const AFTERNOON = 'afternoon'

/**
 * Perfil de cada empleado demo.
 * `absences` define las ausencias aprobadas: [mesOffset, tipo, inicio(día), fin(día)].
 * `overtimeWeekdays` marca los días de la semana con hora extra (0=domingo…6=sábado).
 */
const profiles = [
  {
    document: '1000000001',
    firstName: 'Ana',
    lastName: 'Martínez',
    email: 'demo.ana@nomina.test',
    baseSalary: 3200000,
    position: 'Contadora',
    contractType: 'indefinite',
    shiftType: DAY,
    arlRiskClass: 1,
    overtimeWeekdays: [],
    absences: [],
  },
  {
    document: '1000000002',
    firstName: 'Carlos',
    lastName: 'Gómez',
    email: 'demo.carlos@nomina.test',
    baseSalary: 1750905,
    position: 'Auxiliar administrativo',
    contractType: 'indefinite',
    shiftType: DAY,
    arlRiskClass: 1,
    overtimeWeekdays: [],
    absences: [
      [3, ABSENCE_TYPES.PERMISO_MEDICO, 8, 8],
      [2, ABSENCE_TYPES.PERMISO_LEGAL, 20, 20],
      [1, ABSENCE_TYPES.CALAMIDAD_DOMESTICA, 10, 11],
      [0, ABSENCE_TYPES.LUTO, 6, 6],
      [4, ABSENCE_TYPES.CALAMIDAD_DOMESTICA, 6, 7],
      [5, ABSENCE_TYPES.PERMISO_MEDICO, 10, 10],
    ],
  },
  {
    document: '1000000003',
    firstName: 'Luis',
    lastName: 'Pérez',
    email: 'demo.luis@nomina.test',
    baseSalary: 1850000,
    position: 'Operario de producción',
    contractType: 'fixed',
    shiftType: AFTERNOON,
    arlRiskClass: 2,
    overtimeWeekdays: [],
    absences: [
      [1, ABSENCE_TYPES.INCAPACIDAD_COMUN, 15, 19],
      [5, ABSENCE_TYPES.INCAPACIDAD_COMUN, 8, 12],
    ],
  },
  {
    document: '1000000004',
    firstName: 'María',
    lastName: 'Rodríguez',
    email: 'demo.maria@nomina.test',
    baseSalary: 1750905,
    position: 'Auxiliar de bodega',
    contractType: 'fixed',
    shiftType: AFTERNOON,
    arlRiskClass: 2,
    overtimeWeekdays: [1, 3],
    absences: [
      [1, ABSENCE_TYPES.VACACIONES, 22, 24],
      [4, ABSENCE_TYPES.VACACIONES, 20, 22],
    ],
  },
  {
    document: '1000000005',
    firstName: 'Jorge',
    lastName: 'Sánchez',
    email: 'demo.jorge@nomina.test',
    baseSalary: 2800000,
    position: 'Supervisor de planta',
    contractType: 'indefinite',
    shiftType: DAY,
    arlRiskClass: 1,
    overtimeWeekdays: [1, 3, 5],
    absences: [
      [2, ABSENCE_TYPES.PERMISO_BICICLETA, 3, 3],
      [0, ABSENCE_TYPES.SIN_REMUNERAR, 13, 14],
      [4, ABSENCE_TYPES.PERMISO_BICICLETA, 15, 15],
      [5, ABSENCE_TYPES.SIN_REMUNERAR, 24, 25],
    ],
  },
  {
    document: '1000000006',
    firstName: 'Daniela',
    lastName: 'Torres',
    email: 'demo.daniela@nomina.test',
    baseSalary: 4200000,
    position: 'Desarrolladora de software',
    contractType: 'indefinite',
    shiftType: DAY,
    arlRiskClass: 1,
    overtimeWeekdays: [],
    absences: [],
  },
  {
    document: '1000000007',
    firstName: 'Andrés',
    lastName: 'Castro',
    email: 'demo.andres@nomina.test',
    baseSalary: 2200000,
    position: 'Ejecutivo de ventas',
    contractType: 'indefinite',
    shiftType: DAY,
    arlRiskClass: 1,
    overtimeWeekdays: [2, 4],
    absences: [
      [2, ABSENCE_TYPES.PERMISO_MEDICO, 12, 12],
      [5, ABSENCE_TYPES.PERMISO_MEDICO, 3, 3],
    ],
  },
  {
    document: '1000000008',
    firstName: 'Valentina',
    lastName: 'Herrera',
    email: 'demo.valentina@nomina.test',
    baseSalary: 2600000,
    position: 'Analista de RRHH',
    contractType: 'indefinite',
    shiftType: DAY,
    arlRiskClass: 1,
    overtimeWeekdays: [],
    absences: [
      [1, ABSENCE_TYPES.PERMISO_ESCOLAR, 5, 5],
      [4, ABSENCE_TYPES.PERMISO_ESCOLAR, 12, 12],
    ],
  },
  {
    document: '1000000009',
    firstName: 'Sebastián',
    lastName: 'Ramírez',
    email: 'demo.sebastian@nomina.test',
    baseSalary: 1950000,
    position: 'Coordinador de bodega',
    contractType: 'fixed',
    shiftType: AFTERNOON,
    arlRiskClass: 3,
    overtimeWeekdays: [1, 3, 5],
    absences: [
      [0, ABSENCE_TYPES.CALAMIDAD_DOMESTICA, 20, 21],
      [5, ABSENCE_TYPES.CALAMIDAD_DOMESTICA, 19, 20],
    ],
  },
  {
    document: '1000000010',
    firstName: 'Camila',
    lastName: 'Vargas',
    email: 'demo.camila@nomina.test',
    baseSalary: 3100000,
    position: 'Coordinadora de calidad',
    contractType: 'indefinite',
    shiftType: DAY,
    arlRiskClass: 1,
    overtimeWeekdays: [],
    absences: [
      [0, ABSENCE_TYPES.MATRIMONIO, 9, 13],
      [4, ABSENCE_TYPES.LUTO, 7, 7],
      [5, ABSENCE_TYPES.VACACIONES, 21, 23],
    ],
  },
  {
    document: '1000000011',
    firstName: 'Diana',
    lastName: 'Marín',
    email: 'demo.diana@nomina.test',
    baseSalary: 2800000,
    position: 'Coordinadora administrativa',
    contractType: 'indefinite',
    shiftType: DAY,
    arlRiskClass: 1,
    overtimeWeekdays: [],
    absences: [],
  },
  {
    document: '1000000012',
    firstName: 'Felipe',
    lastName: 'Acosta',
    email: 'demo.felipe@nomina.test',
    baseSalary: 5500000,
    position: 'Líder de tecnología',
    contractType: 'indefinite',
    shiftType: DAY,
    arlRiskClass: 1,
    overtimeWeekdays: [],
    absences: [],
  },
  {
    document: '1000000013',
    firstName: 'Laura',
    lastName: 'Peña',
    email: 'demo.laura@nomina.test',
    baseSalary: 4500000,
    position: 'Directora comercial',
    contractType: 'indefinite',
    shiftType: DAY,
    arlRiskClass: 1,
    overtimeWeekdays: [],
    absences: [],
  },
  {
    document: '1000000014',
    firstName: 'Natalia',
    lastName: 'Duarte',
    email: 'demo.natalia@nomina.test',
    baseSalary: 3800000,
    position: 'Líder de talento humano',
    contractType: 'indefinite',
    shiftType: DAY,
    arlRiskClass: 1,
    overtimeWeekdays: [],
    absences: [],
  },
  {
    document: '1000000015',
    firstName: 'Andrea',
    lastName: 'Salazar',
    email: 'demo.andrea@nomina.test',
    baseSalary: 1900000,
    position: 'Asistente contable',
    contractType: 'indefinite',
    shiftType: DAY,
    arlRiskClass: 1,
    overtimeWeekdays: [],
    absences: [],
  },
  {
    document: '1000000016',
    firstName: 'Juan',
    lastName: 'Herrera',
    email: 'demo.juan@nomina.test',
    baseSalary: 1850000,
    position: 'Operario de producción',
    contractType: 'fixed',
    shiftType: AFTERNOON,
    arlRiskClass: 2,
    overtimeWeekdays: [2, 5],
    absences: [[5, ABSENCE_TYPES.PERMISO_MEDICO, 12, 12]],
  },
  {
    document: '1000000017',
    firstName: 'Marcela',
    lastName: 'Ríos',
    email: 'demo.marcela@nomina.test',
    baseSalary: 2100000,
    position: 'Inspectora de calidad',
    contractType: 'indefinite',
    shiftType: DAY,
    arlRiskClass: 1,
    overtimeWeekdays: [],
    absences: [],
  },
  {
    document: '1000000018',
    firstName: 'Sergio',
    lastName: 'Pardo',
    email: 'demo.sergio@nomina.test',
    baseSalary: 1750000,
    position: 'Auxiliar de despacho',
    contractType: 'fixed',
    shiftType: AFTERNOON,
    arlRiskClass: 2,
    overtimeWeekdays: [1, 4],
    absences: [[4, ABSENCE_TYPES.CALAMIDAD_DOMESTICA, 14, 15]],
  },
  {
    document: '1000000019',
    firstName: 'Miguel',
    lastName: 'Rojas',
    email: 'demo.miguel@nomina.test',
    baseSalary: 3200000,
    position: 'Desarrollador de software',
    contractType: 'indefinite',
    shiftType: DAY,
    arlRiskClass: 1,
    overtimeWeekdays: [],
    absences: [],
  },
  {
    document: '1000000020',
    firstName: 'Paola',
    lastName: 'Ospina',
    email: 'demo.paola.ospina@nomina.test',
    baseSalary: 1900000,
    position: 'Asesora comercial',
    contractType: 'indefinite',
    shiftType: DAY,
    arlRiskClass: 1,
    overtimeWeekdays: [3],
    absences: [[5, ABSENCE_TYPES.PERMISO_ESCOLAR, 6, 6]],
  },
  {
    document: '1000000021',
    firstName: 'Sara',
    lastName: 'Gómez',
    email: 'demo.sara@nomina.test',
    baseSalary: 1750000,
    position: 'Auxiliar de RRHH',
    contractType: 'indefinite',
    shiftType: DAY,
    arlRiskClass: 1,
    overtimeWeekdays: [],
    absences: [],
  },
  {
    document: '1000000022',
    firstName: 'Ricardo',
    lastName: 'Jaramillo',
    email: 'demo.ricardo.jaramillo@nomina.test',
    baseSalary: 2800000,
    position: 'Analista financiero',
    contractType: 'indefinite',
    shiftType: DAY,
    arlRiskClass: 1,
    overtimeWeekdays: [],
    absences: [[4, ABSENCE_TYPES.PERMISO_LEGAL, 8, 8]],
  },
  {
    document: '1000000023',
    firstName: 'Luisa',
    lastName: 'Fernández',
    email: 'demo.luisa@nomina.test',
    baseSalary: 1650000,
    position: 'Recepcionista',
    contractType: 'fixed',
    shiftType: DAY,
    arlRiskClass: 1,
    overtimeWeekdays: [],
    absences: [],
  },
  // Bajas demo para el KPI de rotación (contrato vencido / retiro voluntario).
  {
    document: '1000000101',
    firstName: 'Paola',
    lastName: 'Rincón',
    email: 'demo.paola@nomina.test',
    baseSalary: 1750905,
    position: 'Auxiliar de cartera',
    contractType: 'fixed',
    shiftType: DAY,
    arlRiskClass: 1,
    overtimeWeekdays: [],
    absences: [],
    terminated: true,
    terminationDate: '2026-05-31',
    terminationReason: 'contrato_vencido',
  },
  {
    document: '1000000102',
    firstName: 'Ricardo',
    lastName: 'Mora',
    email: 'demo.ricardo@nomina.test',
    baseSalary: 2200000,
    position: 'Analista de compras',
    contractType: 'indefinite',
    shiftType: DAY,
    arlRiskClass: 1,
    overtimeWeekdays: [],
    absences: [],
    terminated: true,
    terminationDate: '2026-06-15',
    terminationReason: 'retiro_voluntario',
  },
]

// ------------------------------------------------- áreas y cargos (catálogo)
const DEPARTMENT_BY_POSITION = {
  Contadora: 'Finanzas',
  'Auxiliar administrativo': 'Administración',
  'Operario de producción': 'Operaciones',
  'Auxiliar de bodega': 'Logística',
  'Supervisor de planta': 'Operaciones',
  'Desarrolladora de software': 'Tecnología',
  'Ejecutivo de ventas': 'Comercial',
  'Analista de RRHH': 'Talento Humano',
  'Coordinador de bodega': 'Logística',
  'Coordinadora de calidad': 'Calidad',
  'Coordinadora administrativa': 'Administración',
  'Líder de tecnología': 'Tecnología',
  'Directora comercial': 'Comercial',
  'Líder de talento humano': 'Talento Humano',
  'Asistente contable': 'Finanzas',
  'Analista financiero': 'Finanzas',
  'Inspectora de calidad': 'Calidad',
  'Auxiliar de despacho': 'Logística',
  'Desarrollador de software': 'Tecnología',
  'Asesora comercial': 'Comercial',
  'Auxiliar de RRHH': 'Talento Humano',
  Recepcionista: 'Administración',
}

const POSITION_CATALOG = [
  {
    title: 'Contadora',
    department: 'Finanzas',
    functions: [
      'Elaborar y revisar los estados financieros del período.',
      'Conciliar cuentas bancarias y de proveedores.',
      'Preparar la información para declaraciones tributarias.',
      'Apoyar el presupuesto anual y su seguimiento.',
    ],
    requirements: ['Título en contaduría pública', 'Experiencia mínima de 3 años'],
    minSalary: 2900000,
    maxSalary: 3800000,
  },
  {
    title: 'Auxiliar administrativo',
    department: 'Administración',
    functions: [
      'Gestionar la correspondencia y archivo documental.',
      'Apoyar la logística de reuniones y eventos internos.',
      'Mantener actualizadas las bases de datos administrativas.',
    ],
    requirements: ['Técnico o tecnólogo administrativo', 'Manejo de Office'],
    minSalary: 1600000,
    maxSalary: 2000000,
  },
  {
    title: 'Operario de producción',
    department: 'Operaciones',
    functions: [
      'Operar la línea de producción según el plan diario.',
      'Cumplir los estándares de seguridad y calidad.',
      'Reportar novedades de máquinas o materiales.',
    ],
    requirements: ['Bachillerato', 'Disponibilidad para turnos'],
    minSalary: 1700000,
    maxSalary: 2100000,
  },
  {
    title: 'Auxiliar de bodega',
    department: 'Logística',
    functions: [
      'Recibir, verificar y almacenar mercancía.',
      'Preparar pedidos para despacho.',
      'Mantener el inventario actualizado en el sistema.',
    ],
    requirements: ['Bachillerato', 'Experiencia en bodega'],
    minSalary: 1600000,
    maxSalary: 2000000,
  },
  {
    title: 'Supervisor de planta',
    department: 'Operaciones',
    functions: [
      'Coordinar los turnos y la asignación del personal.',
      'Velar por el cumplimiento de metas de producción.',
      'Asegurar el cumplimiento de normas de seguridad.',
    ],
    requirements: ['Tecnólogo o ingeniero industrial', 'Experiencia liderando equipos'],
    minSalary: 2500000,
    maxSalary: 3300000,
  },
  {
    title: 'Desarrolladora de software',
    department: 'Tecnología',
    functions: [
      'Desarrollar y mantener las funcionalidades del sistema.',
      'Revisar y corregir errores reportados.',
      'Participar en el diseño técnico de nuevas soluciones.',
    ],
    requirements: ['Ingeniería de sistemas o afines', 'Conocimiento de JavaScript'],
    minSalary: 3500000,
    maxSalary: 5000000,
  },
  {
    title: 'Ejecutivo de ventas',
    department: 'Comercial',
    functions: [
      'Atender y prospectar clientes nuevos.',
      'Elaborar propuestas y dar seguimiento al cierre.',
      'Registrar la gestión comercial en el CRM.',
    ],
    requirements: ['Tecnólogo o profesional', 'Orientación a resultados'],
    minSalary: 1800000,
    maxSalary: 2800000,
  },
  {
    title: 'Analista de RRHH',
    department: 'Talento Humano',
    functions: [
      'Administrar novedades de personal y ausencias.',
      'Apoyar los procesos de selección y bienestar.',
      'Mantener al día la documentación laboral.',
    ],
    requirements: ['Psicología o administración', 'Conocimiento de legislación laboral'],
    minSalary: 2200000,
    maxSalary: 3200000,
  },
  {
    title: 'Coordinador de bodega',
    department: 'Logística',
    functions: [
      'Planear la recepción y despacho de mercancía.',
      'Controlar el inventario y los niveles mínimos.',
      'Coordinar al equipo de auxiliares de bodega.',
    ],
    requirements: ['Tecnólogo en logística', 'Experiencia en el cargo'],
    minSalary: 1800000,
    maxSalary: 2400000,
  },
  {
    title: 'Coordinadora de calidad',
    department: 'Calidad',
    functions: [
      'Ejecutar auditorías internas de calidad.',
      'Gestionar no conformidades y planes de acción.',
      'Documentar los indicadores de calidad.',
    ],
    requirements: ['Ingeniería o afines', 'Experiencia en sistemas de gestión'],
    minSalary: 2800000,
    maxSalary: 3600000,
  },
  {
    title: 'Coordinadora administrativa',
    department: 'Administración',
    functions: [
      'Coordinar las actividades administrativas de la empresa.',
      'Supervisar el archivo documental y la correspondencia.',
      'Apoyar la gestión de proveedores y compras menores.',
    ],
    requirements: ['Tecnólogo o profesional administrativo', 'Experiencia en coordinación'],
    minSalary: 2400000,
    maxSalary: 3200000,
  },
  {
    title: 'Líder de tecnología',
    department: 'Tecnología',
    functions: [
      'Liderar el equipo de desarrollo y soporte.',
      'Definir la hoja de ruta técnica de la compañía.',
      'Garantizar la disponibilidad y seguridad de los sistemas.',
    ],
    requirements: ['Ingeniería de sistemas o afines', 'Experiencia liderando equipos técnicos'],
    minSalary: 4800000,
    maxSalary: 6500000,
  },
  {
    title: 'Directora comercial',
    department: 'Comercial',
    functions: [
      'Definir la estrategia comercial y de crecimiento.',
      'Coordinar al equipo de ventas y metas del período.',
      'Gestionar cuentas clave y alianzas.',
    ],
    requirements: ['Profesional en administración o marketing', 'Experiencia en dirección comercial'],
    minSalary: 3800000,
    maxSalary: 5500000,
  },
  {
    title: 'Líder de talento humano',
    department: 'Talento Humano',
    functions: [
      'Liderar los procesos de gestión humana y bienestar.',
      'Coordinar selección, capacitación y clima laboral.',
      'Garantizar el cumplimiento de la normativa laboral.',
    ],
    requirements: ['Profesional en RRHH o psicología', 'Experiencia en el área'],
    minSalary: 3200000,
    maxSalary: 4500000,
  },
  {
    title: 'Asistente contable',
    department: 'Finanzas',
    functions: [
      'Registrar facturas, cuentas por pagar y por cobrar.',
      'Apoyar las conciliaciones bancarias mensuales.',
      'Organizar la documentación contable del período.',
    ],
    requirements: ['Técnico en contabilidad', 'Manejo de Excel'],
    minSalary: 1700000,
    maxSalary: 2200000,
  },
  {
    title: 'Analista financiero',
    department: 'Finanzas',
    functions: [
      'Elaborar informes financieros y de flujo de caja.',
      'Analizar indicadores y proyecciones del negocio.',
      'Apoyar la gestión de cartera y pagos.',
    ],
    requirements: ['Profesional en finanzas o contaduría', 'Manejo de Excel avanzado'],
    minSalary: 2400000,
    maxSalary: 3200000,
  },
  {
    title: 'Inspectora de calidad',
    department: 'Calidad',
    functions: [
      'Inspeccionar productos y procesos según estándares.',
      'Registrar resultados de inspección y no conformidades.',
      'Apoyar las auditorías internas de calidad.',
    ],
    requirements: ['Técnico o tecnólogo en calidad', 'Atención al detalle'],
    minSalary: 1800000,
    maxSalary: 2400000,
  },
  {
    title: 'Auxiliar de despacho',
    department: 'Logística',
    functions: [
      'Preparar y despachar pedidos a tiempo.',
      'Verificar cantidades y documentación de entrega.',
      'Coordinar rutas con el transporte.',
    ],
    requirements: ['Bachillerato', 'Disponibilidad para turnos'],
    minSalary: 1600000,
    maxSalary: 2000000,
  },
  {
    title: 'Desarrollador de software',
    department: 'Tecnología',
    functions: [
      'Implementar funcionalidades del sistema.',
      'Corregir errores y realizar pruebas.',
      'Documentar el código y los procesos.',
    ],
    requirements: ['Ingeniería de sistemas o afines', 'Conocimiento de JavaScript'],
    minSalary: 2500000,
    maxSalary: 3800000,
  },
  {
    title: 'Asesora comercial',
    department: 'Comercial',
    functions: [
      'Atender clientes y cotizar productos o servicios.',
      'Dar seguimiento a oportunidades de venta.',
      'Actualizar la información comercial en el sistema.',
    ],
    requirements: ['Bachillerato o técnico', 'Orientación al cliente'],
    minSalary: 1600000,
    maxSalary: 2200000,
  },
  {
    title: 'Auxiliar de RRHH',
    department: 'Talento Humano',
    functions: [
      'Apoyar la gestión documental de los empleados.',
      'Registrar novedades y ausencias en el sistema.',
      'Colaborar en los procesos de bienestar.',
    ],
    requirements: ['Técnico en gestión humana', 'Manejo de Office'],
    minSalary: 1600000,
    maxSalary: 2000000,
  },
  {
    title: 'Recepcionista',
    department: 'Administración',
    functions: [
      'Recibir y atender visitantes y llamadas.',
      'Gestionar la correspondencia de entrada y salida.',
      'Apoyar la logística de reuniones.',
    ],
    requirements: ['Bachillerato', 'Excelente servicio al cliente'],
    minSalary: 1500000,
    maxSalary: 1900000,
  },
]

// ---------------------------------------------------------------- turnos
const dayShift = await shifts.findOne({ tenantId: company._id, name: 'Turno 1' })
const dayShiftId =
  dayShift?._id ??
  (
    await shifts.insertOne({
      tenantId: company._id,
      name: 'Turno 1',
      type: 'fixed',
      days: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
        dayOfWeek,
        ranges: [
          { startTime: '08:00', endTime: '12:00' },
          { startTime: '13:00', endTime: '17:00' },
        ],
        workHours: 8,
        active: true,
      })),
      description: 'Jornada diurna estándar (lunes a viernes)',
      color: '#1867C0',
      active: true,
      createdBy: admin?._id ?? null,
      createdAt: now,
      updatedAt: now,
    })
  ).insertedId

let afternoonShift = await shifts.findOne({
  tenantId: company._id,
  name: 'Turno tarde',
})
if (!afternoonShift) {
  const result = await shifts.insertOne({
    tenantId: company._id,
    name: 'Turno tarde',
    type: 'fixed',
    days: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      dayOfWeek,
      ranges: [
        { startTime: '13:00', endTime: '17:00' },
        { startTime: '18:00', endTime: '22:00' },
      ],
      workHours: 8,
      active: true,
    })),
    description: 'Jornada de tarde con recargo nocturno (lunes a viernes)',
    color: '#00796B',
    active: true,
    createdBy: admin?._id ?? null,
    createdAt: now,
    updatedAt: now,
  })
  afternoonShift = { _id: result.insertedId }
}
const afternoonShiftId = afternoonShift._id

// ------------------------------------------------- áreas y cargos (creación)
const departmentCollection = db.collection('departments')
const positionCollection = db.collection('positions')

const departmentDefinitions = [
  { name: 'Administración', code: 'ADM', color: '#3B82F6', description: 'Gestión administrativa y soporte general.' },
  { name: 'Finanzas', code: 'FIN', color: '#16A34A', description: 'Contabilidad, presupuesto y control financiero.' },
  { name: 'Operaciones', code: 'OPS', color: '#FB8C00', description: 'Producción, mantenimiento y supervisión de planta.' },
  { name: 'Tecnología', code: 'TIC', color: '#7C3AED', description: 'Desarrollo y soporte tecnológico.' },
  { name: 'Comercial', code: 'COM', color: '#DB2777', description: 'Ventas, clientes y crecimiento comercial.' },
  { name: 'Talento Humano', code: 'RRHH', color: '#0EA5E9', description: 'Gestión de personas, bienestar y nómina.' },
  { name: 'Logística', code: 'LOG', color: '#EAB308', description: 'Bodega, inventarios y despachos.' },
  { name: 'Calidad', code: 'CAL', color: '#DC2626', description: 'Aseguramiento y control de calidad.' },
]

const departmentIds = new Map()
for (const definition of departmentDefinitions) {
  await departmentCollection.updateOne(
    { tenantId: company._id, name: definition.name },
    {
      $set: {
        ...definition,
        tenantId: company._id,
        active: true,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  )
  const doc = await departmentCollection.findOne({
    tenantId: company._id,
    name: definition.name,
  })
  departmentIds.set(definition.name, doc._id)
}

for (const position of POSITION_CATALOG) {
  await positionCollection.updateOne(
    { tenantId: company._id, title: position.title },
    {
      $set: {
        ...position,
        department: departmentIds.get(position.department) ?? null,
        tenantId: company._id,
        active: true,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  )
}

// ----------------------------------------------------- empleados + usuarios
const demoEmployeeIds = []
const demoEmployees = []
let createdEmployees = 0
let updatedEmployees = 0

const upsertEmployee = async (profile) => {
  let user = await users.findOne({ email: profile.email })
  if (!user) {
    const password = await bcrypt.hash(DEMO_PASSWORD, 10)
    const result = await users.insertOne({
      email: profile.email,
      password,
      name: `${profile.firstName} ${profile.lastName}`,
      role: ROLES.EMPLOYEE,
      active: true,
      emailStatus: 'none',
      createdAt: now,
      updatedAt: now,
    })
    user = { _id: result.insertedId }
    console.log(`  usuario creado: ${profile.email}`)
  }

  const shiftId = profile.shiftType === AFTERNOON ? afternoonShiftId : dayShiftId
  const existing = await employees.findOne({
    tenantId: company._id,
    document: profile.document,
  })
  const data = {
    tenantId: company._id,
    user: user._id,
    document: profile.document,
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    hireDate: new Date(
      `${months[months.length - 1].year}-01-05T12:00:00.000Z`,
    ),
    contractType: profile.contractType,
    baseSalary: profile.baseSalary,
    arlRiskClass: profile.arlRiskClass,
    position: profile.position,
    department:
      departmentIds.get(DEPARTMENT_BY_POSITION[profile.position] ?? '') ?? null,
    assignedShift: shiftId,
    active: true,
    createdBy: admin?._id ?? null,
    updatedAt: now,
  }
  if (profile.terminated) {
    data.active = false
    data.terminationDate = new Date(`${profile.terminationDate}T12:00:00.000Z`)
    data.terminationReason = profile.terminationReason
  }

  if (existing) {
    await employees.updateOne({ _id: existing._id }, { $set: data })
    updatedEmployees++
    return { _id: existing._id, profile, data }
  }
  const result = await employees.insertOne({ ...data, createdAt: now })
  createdEmployees++
  return { _id: result.insertedId, profile, data }
}

for (const profile of profiles) {
  const employee = await upsertEmployee(profile)
  // Los empleados dados de baja no entran en la generación de nómina/asistencia.
  if (!profile.terminated) {
    demoEmployeeIds.push(employee._id)
    demoEmployees.push(employee)
  }
}

// Empleado existente (Alfredo Marco): asegura turno/ARL y entra a la demo.
const existingEmployee = await employees.findOne({
  tenantId: company._id,
  document: '564387563245',
})
if (existingEmployee) {
  await employees.updateOne(
    { _id: existingEmployee._id },
    { $set: { assignedShift: dayShiftId, arlRiskClass: 1, active: true, updatedAt: now } },
  )
  demoEmployeeIds.push(existingEmployee._id)
  demoEmployees.push({
    _id: existingEmployee._id,
    profile: {
      document: existingEmployee.document,
      firstName: existingEmployee.firstName,
      lastName: existingEmployee.lastName,
      baseSalary: existingEmployee.baseSalary ?? 2500000,
      shiftType: DAY,
      overtimeWeekdays: [],
      absences: [],
    },
  })
} else {
  console.warn('No se encontró el empleado existente (Alfredo Marco); se omite.')
}

// ------------------------------------------- jefes directos y de área
const employeeIdByDocument = new Map()
for (const employee of demoEmployees) {
  employeeIdByDocument.set(String(employee.profile.document), employee._id)
}

// Jefes directos: documento del empleado -> documento de su jefe.
const managerByDocument = {
  '1000000002': '1000000011', // Carlos Gómez → Diana Marín (Administración)
  '1000000003': '1000000005', // Luis Pérez → Jorge Sánchez (Operaciones)
  '1000000004': '1000000009', // María Rodríguez → Sebastián Ramírez (Logística)
  '1000000006': '1000000012', // Daniela Torres → Felipe Acosta (Tecnología)
  '1000000007': '1000000013', // Andrés Castro → Laura Peña (Comercial)
  '1000000008': '1000000014', // Valentina Herrera → Natalia Duarte (Talento Humano)
  '1000000015': '1000000001', // Andrea Salazar → Ana Martínez (Finanzas)
  '1000000016': '1000000005', // Juan Herrera → Jorge Sánchez (Operaciones)
  '1000000017': '1000000010', // Marcela Ríos → Camila Vargas (Calidad)
  '1000000018': '1000000009', // Sergio Pardo → Sebastián Ramírez (Logística)
  '1000000019': '1000000012', // Miguel Rojas → Felipe Acosta (Tecnología)
  '1000000020': '1000000013', // Paola Ospina → Laura Peña (Comercial)
  '1000000021': '1000000014', // Sara Gómez → Natalia Duarte (Talento Humano)
  '1000000022': '1000000001', // Ricardo Jaramillo → Ana Martínez (Finanzas)
  '1000000023': '1000000011', // Luisa Fernández → Diana Marín (Administración)
}

for (const [document, managerDocument] of Object.entries(managerByDocument)) {
  const employeeId = employeeIdByDocument.get(document)
  const managerId = employeeIdByDocument.get(managerDocument)
  if (employeeId && managerId) {
    await employees.updateOne(
      { _id: employeeId },
      { $set: { manager: managerId, updatedAt: now } },
    )
  }
}

// Jefes de área: nombre del área -> documento del responsable.
const areaManagerByDocument = {
  Administración: '1000000011', // Diana Marín
  Finanzas: '1000000001', // Ana Martínez
  Operaciones: '1000000005', // Jorge Sánchez
  Tecnología: '1000000012', // Felipe Acosta
  Comercial: '1000000013', // Laura Peña
  'Talento Humano': '1000000014', // Natalia Duarte
  Logística: '1000000009', // Sebastián Ramírez
  Calidad: '1000000010', // Camila Vargas
}

for (const [areaName, managerDocument] of Object.entries(areaManagerByDocument)) {
  const managerId = employeeIdByDocument.get(managerDocument)
  if (managerId) {
    await departmentCollection.updateOne(
      { tenantId: company._id, name: areaName },
      { $set: { manager: managerId, updatedAt: now } },
    )
  }
}

// ------------------------------------------------------------- utilidades
const getWorkdays = (monthInfo) => {
  const daysInMonth = new Date(monthInfo.year, monthInfo.month, 0).getDate()
  const result = []
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${monthInfo.year}-${pad(monthInfo.month)}-${pad(day)}`
    const weekday = new Date(`${dateStr}T12:00:00-05:00`).getDay()
    if (weekday === 0 || weekday === 6) continue
    result.push({
      day,
      dateStr,
      weekday,
      week: Math.floor((day - 1) / 7),
    })
  }
  return result
}

const buildAttendance = (employee, profile, workday) => {
  const { dateStr, weekday } = workday
  const hasOvertime = (profile.overtimeWeekdays ?? []).includes(weekday)
  const isAfternoon = profile.shiftType === AFTERNOON
  const clockIn = new Date(
    `${dateStr}T${isAfternoon ? '13:00' : '08:00'}:00-05:00`,
  )
  const clockOut = new Date(
    `${dateStr}T${isAfternoon ? (hasOvertime ? '22:00' : '21:00') : hasOvertime ? '18:00' : '16:00'}:00-05:00`,
  )
  const { dayHours, nightHours } = splitDayNightHours(
    clockIn,
    clockOut,
    NIGHT_START,
    NIGHT_END,
  )
  const { overtimeDayHours, overtimeNightHours } = splitOvertimeFromEnd(
    clockIn,
    clockOut,
    REGULAR_DAILY_HOURS,
    NIGHT_START,
    NIGHT_END,
  )
  return {
    employee: employee._id,
    tenantId: company._id,
    date: new Date(`${dateStr}T12:00:00.000Z`),
    clockIn,
    clockOut,
    hoursWorked: round2(dayHours + nightHours),
    dayHours,
    nightHours,
    overtimeDayHours,
    overtimeNightHours,
    nightSurcharge: round2(nightHours * NIGHT_SURCHARGE_RATE),
    assignedShift: isAfternoon ? afternoonShiftId : dayShiftId,
    status: 'approved',
    observations: hasOvertime ? 'Jornada con horas extra' : undefined,
    recordedBy: admin?._id ?? null,
    createdAt: now,
    updatedAt: now,
  }
}

const getAbsenceDays = (type, start, end, dayOff = 0) => {
  if (
    [
      ABSENCE_TYPES.INCAPACIDAD_COMUN,
      ABSENCE_TYPES.INCAPACIDAD_LABORAL,
      ABSENCE_TYPES.VACACIONES,
      ABSENCE_TYPES.DESCANSO_COMPENSATORIO,
      ABSENCE_TYPES.SIN_REMUNERAR,
    ].includes(type)
  ) {
    return Math.round((end - start) / 86400000) + 1
  }
  let days = 0
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    if (cursor.getDay() !== dayOff) days++
  }
  return days
}

const dailySalary = (baseSalary) => round2(baseSalary / 30)

const buildAbsenceValues = (type, baseSalary, days) => {
  if (type === ABSENCE_TYPES.INCAPACIDAD_COMUN) {
    const employerDays = Math.min(
      legal.employerPaidIncapacidadDays ?? DEFAULT_EMPLOYER_PAID_INCAPACIDAD_DAYS,
      days,
    )
    const percent = legal.incapacidadComunDailyPercent ?? INCAPACIDAD_COMUN_DAILY_PERCENT
    const daily = dailySalary(baseSalary)
    return {
      paidByCompanyDays: employerDays,
      companyPaidValue: round2(employerDays * daily * percent),
      epsValue: round2((days - employerDays) * daily * percent),
      arlValue: 0,
      surchargePaid: false,
    }
  }
  if (type === ABSENCE_TYPES.INCAPACIDAD_LABORAL) {
    return {
      paidByCompanyDays: 0,
      companyPaidValue: 0,
      epsValue: 0,
      arlValue: round2(days * dailySalary(baseSalary)),
      surchargePaid: false,
    }
  }
  return {
    paidByCompanyDays: 0,
    companyPaidValue: 0,
    epsValue: 0,
    arlValue: 0,
    surchargePaid: false,
  }
}

const getMonthAbsences = async (monthInfo) => {
  const cursor = absences.find({
    employee: { $in: demoEmployeeIds },
    status: 'approved',
    startDate: { $lte: monthInfo.end },
    endDate: { $gte: monthInfo.start },
  })
  return cursor.toArray()
}

const getAttendanceSummary = async (employeeId, monthInfo) => {
  const rows = await attendances
    .aggregate([
      {
        $match: {
          employee: employeeId,
          date: { $gte: monthInfo.start, $lte: monthInfo.end },
        },
      },
      {
        $group: {
          _id: null,
          days: { $sum: 1 },
          hoursWorked: { $sum: '$hoursWorked' },
          overtimeDayHours: { $sum: '$overtimeDayHours' },
          overtimeNightHours: { $sum: '$overtimeNightHours' },
          nightSurcharge: { $sum: '$nightSurcharge' },
        },
      },
    ])
    .toArray()
  return (
    rows[0] ?? {
      days: 0,
      hoursWorked: 0,
      overtimeDayHours: 0,
      overtimeNightHours: 0,
      nightSurcharge: 0,
    }
  )
}

// Cálculo idéntico al servicio de producción (payroll.service.ts).
const buildPayrollEntry = async (employee, monthInfo) => {
  const profile = employee.profile
  const baseSalary = profile.baseSalary
  const summary = await getAttendanceSummary(employee._id, monthInfo)
  const monthAbsences = await getMonthAbsences(monthInfo)
  const employeeAbsences = monthAbsences.filter(
    (absence) => String(absence.employee) === String(employee._id),
  )

  let paidAbsenceDays = 0
  let absenceCompanyPaidValue = 0
  let absenceEpsValue = 0
  let absenceArlValue = 0
  for (const absence of employeeAbsences) {
    if (REMUNERATED_ABSENCE_TYPES.includes(absence.type)) {
      paidAbsenceDays += absence.days ?? 0
    } else if (absence.type === ABSENCE_TYPES.INCAPACIDAD_COMUN) {
      absenceCompanyPaidValue += absence.companyPaidValue ?? 0
      absenceEpsValue += absence.epsValue ?? 0
    } else if (absence.type === ABSENCE_TYPES.INCAPACIDAD_LABORAL) {
      absenceArlValue += absence.arlValue ?? 0
    }
  }

  const periodDays =
    Math.round((monthInfo.end - monthInfo.start) / 86400000) + 1
  const daysWorked = Math.min(periodDays, summary.days + paidAbsenceDays)
  const factor = Math.min(1, daysWorked / periodDays)
  const devBaseSalary = round2(baseSalary * factor)
  const allowanceApplies = baseSalary > 0 && baseSalary < 2 * legal.minimumWage
  const transportAllowance = allowanceApplies
    ? round2((legal.transportAllowance ?? 0) * factor)
    : 0

  const baseHours = legal.baseHoursPerMonth ?? 240
  const hourlyRate = baseSalary / baseHours
  const overtimeDay = round2(summary.overtimeDayHours * hourlyRate * 1.25)
  const overtimeNight = round2(summary.overtimeNightHours * hourlyRate * 1.75)
  const nightSurcharge = round2(summary.nightSurcharge * hourlyRate)

  const devengados = {
    baseSalary: devBaseSalary,
    daysWorked,
    paidAbsenceDays,
    absenceCompanyPaidValue: round2(absenceCompanyPaidValue),
    absenceEpsValue: round2(absenceEpsValue),
    absenceArlValue: round2(absenceArlValue),
    transportAllowance,
    overtimeDay,
    overtimeNight,
    nightSurcharge,
    bonuses: 0,
    commissions: 0,
    total: round2(
      devBaseSalary +
        transportAllowance +
        overtimeDay +
        overtimeNight +
        nightSurcharge +
        absenceCompanyPaidValue,
    ),
  }

  const ibc = round2(devBaseSalary + transportAllowance)
  const healthEmployeeRate = legal.healthPercentages?.employee ?? 0.04
  const pensionEmployeeRate = legal.pensionPercentages?.employee ?? 0.04
  const employeeHealth = round2(ibc * healthEmployeeRate)
  const employeePension = round2(ibc * pensionEmployeeRate)

  const uvt = legal.uvtValue || 1
  const uvtIncome = devBaseSalary / uvt
  const bracket = (legal.withholdingRates ?? []).find(
    (rate) => uvtIncome >= rate.from && uvtIncome <= rate.to,
  )
  const sourceRetention = bracket
    ? round2(Math.max(0, devBaseSalary - bracket.from * uvt) * (bracket.percentage / 100))
    : 0

  const deducciones = {
    employeeHealth,
    employeePension,
    sourceRetention,
    garnishments: 0,
    loans: 0,
    total: round2(employeeHealth + employeePension + sourceRetention),
  }

  const employerHealthRate = legal.healthPercentages?.employer ?? 0.085
  const employerPensionRate = legal.pensionPercentages?.employer ?? 0.12
  const arlRate =
    legal.arlRates?.[String(profile.arlRiskClass)] ?? 0
  const senaRate = legal.parafiscales?.sena ?? 0.02
  const icbfRate = legal.parafiscales?.icbf ?? 0.03
  const cajaRate = legal.parafiscales?.compensationFund ?? 0.04

  const seguridadSocial = {
    employerHealth: round2(ibc * employerHealthRate),
    employerPension: round2(ibc * employerPensionRate),
    arl: round2(devBaseSalary * arlRate),
    sena: round2(ibc * senaRate),
    icbf: round2(ibc * icbfRate),
    compensationFund: round2(ibc * cajaRate),
    total: round2(
      ibc * employerHealthRate +
        ibc * employerPensionRate +
        devBaseSalary * arlRate +
        ibc * senaRate +
        ibc * icbfRate +
        ibc * cajaRate,
    ),
  }

  return {
    employee: employee._id,
    devengados,
    deducciones,
    seguridadSocial,
    totalToPay: Math.max(0, round2(devengados.total - deducciones.total)),
    observations: employeeAbsences.length
      ? `${employeeAbsences.length} ausencia(s) aprobada(s) en el período`
      : undefined,
  }
}

// --------------------------------------------------------- mes por mes
const monthLog = []
let totalAttendance = 0
let totalAbsences = 0
let totalPayrolls = 0

// Limpieza general de la ventana demo: elimina cualquier nómina (aprobada o
// borrador) cuyo período intersecte la ventana, incluidos los períodos con
// fechas mal cortadas de ejecuciones anteriores (ej. 01/MM → 01/MM+1).
const firstMonth = months[0]
const lastMonth = months[months.length - 1]
const cleanupRange = {
  start: new Date(`${firstMonth.year}-${pad(firstMonth.month)}-01T00:00:00.000Z`),
  // Cubre también períodos mal cortados que terminan el día 1 del mes siguiente.
  end: new Date(
    `${lastMonth.month === 12 ? lastMonth.year + 1 : lastMonth.year}-${pad(lastMonth.month === 12 ? 1 : lastMonth.month + 1)}-01T00:00:00.000Z`,
  ),
}
const cleaned = await payrolls.deleteMany({
  tenantId: company._id,
  periodStart: { $lte: cleanupRange.end },
  periodEnd: { $gte: cleanupRange.start },
})
console.log(`nóminas previas de la ventana eliminadas: ${cleaned.deletedCount}`)

for (const monthInfo of months) {
  const workdays = getWorkdays(monthInfo)

  // Limpieza idempotente del mes.
  await attendances.deleteMany({
    employee: { $in: demoEmployeeIds },
    date: { $gte: monthInfo.start, $lte: monthInfo.end },
  })
  await absences.deleteMany({
    employee: { $in: demoEmployeeIds },
    startDate: { $gte: monthInfo.start },
    endDate: { $lte: monthInfo.end },
  })
  await payrolls.deleteMany({
    tenantId: company._id,
    periodStart: monthInfo.start,
    periodEnd: monthInfo.end,
  })

  // Ausencias del mes.
  const absenceDocs = []
  for (const employee of demoEmployees) {
    const rules = (employee.profile.absences ?? []).filter(
      (rule) => rule[0] === monthInfo.offset,
    )
    for (const rule of rules) {
      const [, type, startDay, endDay] = rule
      const startDate = new Date(
        `${monthInfo.year}-${pad(monthInfo.month)}-${pad(startDay)}T12:00:00.000Z`,
      )
      const endDate = new Date(
        `${monthInfo.year}-${pad(monthInfo.month)}-${pad(endDay)}T12:00:00.000Z`,
      )
      const days = getAbsenceDays(type, startDate, endDate, 0)
      const values = buildAbsenceValues(
        type,
        employee.profile.baseSalary,
        days,
      )
      absenceDocs.push({
        tenantId: company._id,
        employee: employee._id,
        type,
        startDate,
        endDate,
        days,
        ...values,
        scheduledRestDate: null,
        supportDocument: type === ABSENCE_TYPES.INCAPACIDAD_COMUN ? 'incapacidad.pdf' : undefined,
        observations: `Ausencia demo: ${type}`,
        status: 'approved',
        approvedBy: admin?._id ?? null,
        approvedAt: now,
        createdBy: admin?._id ?? null,
        createdAt: now,
        updatedAt: now,
      })
    }
  }
  if (absenceDocs.length) await absences.insertMany(absenceDocs)

  // Asistencias: se salta únicamente los días cubiertos por cada ausencia del
  // propio empleado (no los de otros empleados).
  const absenceDatesByEmployee = new Map()
  for (const absence of absenceDocs) {
    const employeeKey = String(absence.employee)
    if (!absenceDatesByEmployee.has(employeeKey)) {
      absenceDatesByEmployee.set(employeeKey, new Set())
    }
    const absenceDates = absenceDatesByEmployee.get(employeeKey)
    for (
      let cursor = new Date(absence.startDate);
      cursor <= absence.endDate;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      const key = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`
      absenceDates.add(key)
    }
  }
  const attendanceDocs = []
  for (const employee of demoEmployees) {
    const profile = employee.profile
    const employeeAbsenceDates =
      absenceDatesByEmployee.get(String(employee._id)) ?? new Set()
    for (const workday of workdays) {
      const dateKey = `${monthInfo.year}-${pad(monthInfo.month)}-${pad(workday.day)}`
      if (employeeAbsenceDates.has(dateKey)) continue
      attendanceDocs.push(buildAttendance(employee, profile, workday))
    }
  }
  if (attendanceDocs.length) await attendances.insertMany(attendanceDocs)

  // Nómina del mes.
  const entries = await Promise.all(
    demoEmployees.map((employee) => buildPayrollEntry(employee, monthInfo)),
  )
  const totalEarned = round2(entries.reduce((acc, entry) => acc + entry.devengados.total, 0))
  const totalDeducted = round2(
    entries.reduce((acc, entry) => acc + entry.deducciones.total, 0),
  )
  const totalSocialSecurity = round2(
    entries.reduce((acc, entry) => acc + entry.seguridadSocial.total, 0),
  )
  const totalToPay = round2(
    entries.reduce((acc, entry) => acc + entry.totalToPay, 0),
  )

  await payrolls.insertOne({
    tenantId: company._id,
    periodStart: monthInfo.start,
    periodEnd: monthInfo.end,
    status: monthInfo.status,
    employees: entries,
    totalEarned,
    totalDeducted,
    totalSocialSecurity,
    totalToPay,
    createdBy: admin?._id ?? null,
    ...(monthInfo.status === 'approved'
      ? { approvedBy: admin?._id ?? null, approvedAt: now }
      : {}),
    createdAt: now,
    updatedAt: now,
  })

  monthLog.push(
    `${monthInfo.label} · ${monthInfo.status} · ${entries.length} emp · dev $${totalEarned.toLocaleString('es-CO')} · neto $${totalToPay.toLocaleString('es-CO')} · ${attendanceDocs.length} asistencias · ${absenceDocs.length} ausencias`,
  )
  totalAttendance += attendanceDocs.length
  totalAbsences += absenceDocs.length
  totalPayrolls += 1
}

// ------------------------------------------------------------- resumen
console.log('------------------ resumen ------------------')
console.log(`empleados demo creados: ${createdEmployees}`)
console.log(`empleados demo actualizados: ${updatedEmployees}`)
console.log(`nóminas generadas: ${totalPayrolls} (3 aprobadas + 1 borrador)`)
console.log(`asistencias totales: ${totalAttendance}`)
console.log(`ausencias aprobadas totales: ${totalAbsences}`)
console.log('')
console.log('Mes por mes:')
for (const line of monthLog) console.log(`  ${line}`)
console.log('')
console.log('Dashboard: abre /reports para ver los 4 meses; el último mes')
console.log('  aparecerá con barra naranja "Borrador (provisional)" en la gráfica.')
console.log(
  `Usuarios demo (rol empleado): contraseña "${DEMO_PASSWORD}" para los correos demo.*@nomina.test`,
)

await mongoose.disconnect()
