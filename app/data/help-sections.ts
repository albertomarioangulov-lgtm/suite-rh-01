// ============================================================
// Contenido del Centro de Ayuda (manual por módulo)
// Modelado igual que bis-sw-01: secciones con bloques ricos,
// FAQ por sección y secciones relacionadas.
// ============================================================

export type HelpAudience = 'todos' | 'gestion' | 'empleado'
export type HelpCategory = 'modulos' | 'procesos' | 'roles' | 'referencia'

export interface HelpBlock {
  type: 'title' | 'paragraph' | 'list' | 'steps' | 'table' | 'warning'
  text?: string
  items?: string[]
  headers?: string[]
  rows?: string[][]
  tone?: 'info' | 'warning' | 'success'
}

export interface HelpFaq {
  q: string
  a: string
}

export interface HelpSection {
  id: string
  title: string
  icon: string
  audience: HelpAudience
  category: HelpCategory
  summary: string
  blocks: HelpBlock[]
  faqs?: HelpFaq[]
  related?: string[]
}

export const AUDIENCE_LABELS: Record<HelpAudience, string> = {
  todos: 'Todos',
  gestion: 'Gestión',
  empleado: 'Empleado',
}

export const CATEGORY_LABELS: Record<HelpCategory, string> = {
  modulos: 'Módulos',
  procesos: 'Procesos',
  roles: 'Roles',
  referencia: 'Referencia',
}

export const audienceLabel = (audience: HelpAudience): string =>
  AUDIENCE_LABELS[audience] || audience

export const categoryLabel = (category: HelpCategory): string =>
  CATEGORY_LABELS[category] || category

export const helpSections: HelpSection[] = [
  {
    id: 'inicio',
    title: 'Introducción y acceso',
    icon: 'mdi-home-outline',
    audience: 'todos',
    category: 'referencia',
    summary: 'Qué es el sistema, para quién es y cómo iniciar sesión.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Suite RH es el sistema de gestión de recursos humanos de la empresa: administra empleados, asistencia, turnos, ausencias y licencias, incapacidades, nómina y parámetros legales.',
      },
      { type: 'title', text: 'Iniciar sesión' },
      {
        type: 'steps',
        items: [
          'Abra la dirección web del sistema en su navegador (Chrome, Edge o Firefox).',
          'Ingrese su correo electrónico y su contraseña (mínimo 6 caracteres).',
          'Presione el botón Iniciar sesión.',
        ],
      },
      { type: 'title', text: 'Cerrar sesión' },
      {
        type: 'steps',
        items: [
          'Pulse el ícono de su cuenta en la barra superior.',
          'Seleccione Cerrar sesión.',
          'El sistema lo devuelve a la pantalla de acceso.',
        ],
      },
      {
        type: 'warning',
        tone: 'info',
        text: 'Cierre sesión siempre que use un equipo compartido. Si la sesión expira, el sistema lo devuelve a la pantalla de acceso.',
      },
    ],
    faqs: [
      {
        q: '¿Cómo inicio sesión en el sistema?',
        a: 'Ingrese su correo y contraseña en la página de acceso. La sesión permanece activa hasta que la cierre manualmente o expire.',
      },
      {
        q: '¿Qué hago si olvido mi contraseña?',
        a: 'La recuperación automática aún no está disponible: contacte a un administrador o al soporte técnico para restablecerla.',
      },
    ],
    related: ['roles', 'soporte'],
  },
  {
    id: 'roles',
    title: 'Roles y permisos',
    icon: 'mdi-shield-account-outline',
    audience: 'todos',
    category: 'roles',
    summary: 'Lo que puede hacer cada rol y qué ve en el menú.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Cada cuenta tiene un rol que define qué módulos puede abrir y qué acciones puede realizar.',
      },
      {
        type: 'table',
        headers: ['Rol', '¿Qué puede hacer?'],
        rows: [
          ['Administrador', 'Acceso total: configura la empresa y los parámetros legales, administra usuarios y gestiona todos los módulos.'],
          ['Gerente', 'Consulta y gestiona empleados, asistencia, turnos, ausencias y nómina. No administra usuarios.'],
          ['Recursos Humanos', 'Gestiona empleados, asistencia, turnos, ausencias y nómina. No administra usuarios ni parámetros.'],
          ['Empleado', 'Consulta su información y solicita permisos desde el portal de autoservicio.'],
        ],
      },
      { type: 'title', text: '¿Qué ve cada rol en el menú?' },
      {
        type: 'list',
        items: [
          'Administrador: ve todos los módulos, incluidos Usuarios, Emails y Configuración.',
          'Gerente y Recursos Humanos: ven Empleados, Asistencia, Turnos, Ausencias y Nómina.',
          'Empleado: ve su perfil y los módulos habilitados para autoservicio.',
        ],
      },
    ],
    faqs: [
      {
        q: '¿Por qué no veo un módulo?',
        a: 'Su rol no tiene permiso para ese módulo. Solicite el rol adecuado al administrador.',
      },
    ],
    related: ['usuarios', 'soporte'],
  },
  {
    id: 'empleados',
    title: 'Empleados',
    icon: 'mdi-account-group-outline',
    audience: 'gestion',
    category: 'modulos',
    summary: 'Fichas de empleados: contrato, salario, asistencia y ausencias.',
    blocks: [
      {
        type: 'paragraph',
        text: 'El módulo Empleados administra las fichas laborales: documento, contrato, salario base, cargo, turno asignado y estado.',
      },
      { type: 'title', text: 'Crear un empleado' },
      {
        type: 'steps',
        items: [
          'En Empleados presione Nuevo empleado.',
          'Elija el modo de cuenta: sin cuenta, vincular un usuario existente con rol empleado o crear una cuenta nueva.',
          'Complete documento, nombre, apellido, cargo y salario base.',
          'Guarde. El empleado queda activo por defecto.',
        ],
      },
      { type: 'title', text: 'Ficha del empleado' },
      {
        type: 'list',
        items: [
          'La ficha muestra identificación, contacto, salario, turno y antigüedad.',
          'Incluye la asistencia reciente del empleado.',
          'Desde la ficha puede registrar, aprobar o rechazar ausencias del empleado.',
        ],
      },
      { type: 'title', text: 'Día de descanso y tipo de contrato' },
      {
        type: 'paragraph',
        text: 'El empleado tiene configurado su día de descanso semanal (por defecto domingo) y su tipo de contrato (indefinido, fijo, obra o labor, prácticas). Estos datos se usan para calcular días hábiles y recargos.',
      },
      {
        type: 'warning',
        tone: 'warning',
        text: 'Un empleado vinculado a un usuario solo puede asociarse a cuentas con rol empleado.',
      },
    ],
    faqs: [
      {
        q: '¿Cómo asigno un turno a un empleado?',
        a: 'Desde el detalle del turno use "Asignar empleados", o edite la ficha del empleado y seleccione el turno.',
      },
      {
        q: '¿Cómo gestiono ausencias desde la ficha?',
        a: 'En la ficha del empleado, la sección "Ausencias recientes" permite crear una nueva y aprobar o rechazar las pendientes.',
      },
    ],
    related: ['usuarios', 'turnos', 'ausencias', 'asistencia'],
  },
  {
    id: 'asistencia',
    title: 'Asistencia',
    icon: 'mdi-clock-in',
    audience: 'gestion',
    category: 'modulos',
    summary: 'Registro de entradas y salidas, horas y extras.',
    blocks: [
      {
        type: 'paragraph',
        text: 'El módulo Asistencia registra la jornada de cada empleado. El sistema calcula automáticamente las horas trabajadas, las diurnas y nocturnas, las horas extras y el recargo nocturno.',
      },
      { type: 'title', text: 'Registrar asistencia' },
      {
        type: 'steps',
        items: [
          'En Asistencia presione Nuevo registro.',
          'Seleccione el empleado, la hora de entrada y la hora de salida.',
          'Agregue observaciones si aplica y guarde.',
          'El sistema calcula horas, extras y recargos según la configuración de la empresa.',
        ],
      },
      { type: 'title', text: 'Límites legales de horas extras' },
      {
        type: 'table',
        headers: ['Límite', 'Valor'],
        rows: [
          ['Horas extra diarias', 'Máximo 2 horas.'],
          ['Horas extra semanales', 'Máximo 12 horas.'],
          ['Recargo nocturno', '35% sobre la hora ordinaria.'],
        ],
      },
      {
        type: 'warning',
        tone: 'warning',
        text: 'Al superar los límites legales, el sistema genera una alerta para el empleado y la empresa.',
      },
    ],
    faqs: [
      {
        q: '¿Puedo registrar la asistencia de un empleado dos veces el mismo día?',
        a: 'No. Solo existe un registro por empleado y por fecha. Edite el registro existente si necesita corregirlo.',
      },
      {
        q: '¿Qué pasa si un empleado no tiene asistencia en el período?',
        a: 'La nómina no se puede aprobar, salvo que el empleado tenga ausencias remuneradas o incapacidades aprobadas.',
      },
    ],
    related: ['turnos', 'nomina', 'ausencias'],
  },
  {
    id: 'turnos',
    title: 'Turnos y horarios',
    icon: 'mdi-calendar-clock-outline',
    audience: 'gestion',
    category: 'modulos',
    summary: 'Turnos fijos o rotativos, asignación y calendario.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Los turnos definen la jornada de cada empleado: rangos de hora por día (incluida jornada partida), turnos fijos o rotativos y el total semanal.',
      },
      { type: 'title', text: 'Crear un turno' },
      {
        type: 'steps',
        items: [
          'En Turnos presione Nuevo turno.',
          'Nombre, tipo (fijo o rotativo) y color.',
          'Defina los rangos de cada día de la semana (ej. 08:00-12:00 y 13:00-17:00).',
          'El sistema valida la jornada diaria (6-9 h) y el máximo semanal (42 h).',
        ],
      },
      { type: 'title', text: 'Asignar turno a empleados' },
      {
        type: 'steps',
        items: [
          'Abra el detalle del turno.',
          'Presione Asignar y seleccione los empleados.',
          'El turno queda registrado en la ficha del empleado.',
        ],
      },
      { type: 'title', text: 'Calendario de turnos' },
      {
        type: 'paragraph',
        text: 'La vista de calendario muestra los turnos de la semana para visualizar la distribución del equipo.',
      },
      {
        type: 'warning',
        tone: 'warning',
        text: 'Un turno rotativo debe definir los 7 días de la semana.',
      },
    ],
    faqs: [
      {
        q: '¿Puedo tener una jornada partida (con almuerzo)?',
        a: 'Sí. Cada día admite varios rangos de tiempo, por ejemplo 08:00-12:00 y 13:00-17:00.',
      },
    ],
    related: ['asistencia', 'empleados'],
  },
  {
    id: 'ausencias',
    title: 'Ausencias y permisos',
    icon: 'mdi-calendar-edit-outline',
    audience: 'gestion',
    category: 'modulos',
    summary: 'Licencias, incapacidades, descansos compensatorios y su efecto en la nómina.',
    blocks: [
      {
        type: 'paragraph',
        text: 'El módulo Ausencias gestiona todos los tipos de ausencia: permisos médicos, escolares, legales, día de bicicleta, calamidad doméstica, luto, matrimonio, incapacidades común y laboral, vacaciones, permisos sin remunerar y descansos compensatorios.',
      },
      { type: 'title', text: 'Registrar una ausencia' },
      {
        type: 'steps',
        items: [
          'En Ausencias presione Nueva ausencia, o use el botón "Nueva" en la ficha del empleado.',
          'Seleccione el empleado y el tipo de ausencia.',
          'Indique las fechas (inicio y fin) y el soporte documental.',
          'Guarde: la ausencia queda pendiente hasta que la aprueben RRHH o gerencia.',
        ],
      },
      { type: 'title', text: 'Aprobar o rechazar' },
      {
        type: 'steps',
        items: [
          'Desde la lista o la ficha del empleado, use ✓ para aprobar.',
          'Para rechazar use ✗ e ingrese el motivo (obligatorio).',
          'La ausencia aprobada alimenta la nómina del período.',
        ],
      },
      { type: 'title', text: 'Incapacidades' },
      {
        type: 'table',
        headers: ['Tipo', '¿Quién paga?'],
        rows: [
          ['Incapacidad común', 'La empresa paga los primeros 2 días (66,67% del salario diario); la EPS cubre del día 3 en adelante.'],
          ['Incapacidad laboral', 'La ARL cubre el 100% del salario desde el primer día.'],
        ],
      },
      { type: 'title', text: 'Descanso compensatorio' },
      {
        type: 'paragraph',
        text: 'Cuando un empleado trabaja su día de descanso, tiene derecho a un descanso compensatorio. El recargo por ese día es del 80% hasta junio de 2026, 90% hasta junio de 2027 y 100% desde julio de 2027, salvo que la empresa configure otro valor.',
      },
      { type: 'title', text: 'Permisos remunerados y no remunerados' },
      {
        type: 'list',
        items: [
          'Remunerados: médico, escolar, legal, bicicleta, calamidad, luto, matrimonio y vacaciones. No descuentan días y cuentan para prestaciones.',
          'No remunerados: permiso sin remunerar. Descuenta los días del salario.',
          'Los días máximos por tipo al año se controlan con la política de la empresa.',
        ],
      },
      {
        type: 'warning',
        tone: 'info',
        text: 'La vista de calendario muestra todas las ausencias del mes con su estado (aprobado, pendiente, rechazado).',
      },
    ],
    faqs: [
      {
        q: '¿Cómo se calculan los días de una ausencia?',
        a: 'Los permisos usan días hábiles (lunes a sábado si el descanso es domingo); las incapacidades y vacaciones usan días de calendario.',
      },
      {
        q: '¿Puedo aprobar una ausencia desde la ficha del empleado?',
        a: 'Sí, en la sección "Ausencias recientes" de la ficha.',
      },
      {
        q: '¿Qué pasa si supero la política anual de permisos?',
        a: 'El sistema bloquea el registro con un mensaje indicando los días máximos y el saldo disponible.',
      },
    ],
    related: ['nomina', 'empleados', 'configuracion', 'marco-legal', 'calendario'],
  },
  {
    id: 'nomina',
    title: 'Nómina',
    icon: 'mdi-cash-multiple',
    audience: 'gestion',
    category: 'modulos',
    summary: 'Liquidación de períodos, devengados, deducciones y aprobación.',
    blocks: [
      {
        type: 'paragraph',
        text: 'El módulo Nómina liquida cada período a partir de la asistencia, las ausencias aprobadas, las horas extras y los parámetros legales vigentes.',
      },
      { type: 'title', text: 'Crear una nómina' },
      {
        type: 'steps',
        items: [
          'En Nómina presione Nueva nómina.',
          'Indique el inicio y el fin del período (ej. 01/07/2026 – 31/07/2026).',
          'El sistema liquida a todos los empleados activos en borrador.',
          'Revise los devengados y deducciones de cada empleado.',
          'Apruebe el borrador y luego márquela como pagada.',
        ],
      },
      { type: 'title', text: '¿Qué incluye cada liquidación?' },
      {
        type: 'list',
        items: [
          'Devengados: salario base prorrateado, auxilio de transporte, extras, recargos, bonificaciones, comisiones y valores de incapacidad.',
          'Deducciones: salud, pensión, retención en la fuente, embargos y préstamos.',
          'Seguridad social empleador: salud, pensión, ARL y parafiscales.',
        ],
      },
      { type: 'title', text: '¿Cómo se calcula cada dato?' },
      {
        type: 'table',
        headers: ['Dato', 'Fórmula / cómo se calcula', 'Base legal'],
        rows: [
          [
            'Salario base',
            'Salario mensual × (días del período trabajados ÷ total de días del período). Los permisos remunerados cuentan como días trabajados.',
            'Art. 25 y 127 CST · Ley 2101 de 2021',
          ],
          [
            'Auxilio de transporte',
            'Solo si el salario es menor a 2 SMMLV. Valor vigente × factor de días trabajados.',
            'Ley 15 de 1959 · Art. 7 Ley 1 de 1963',
          ],
          [
            'Hora extra diurna',
            'Salario mensual ÷ 240 (valor hora) × 1,25 × horas extra diurnas.',
            'Art. 168 y 169 CST',
          ],
          [
            'Hora extra nocturna',
            'Valor hora × 1,75 × horas extra nocturnas.',
            'Art. 168, 169 y 170 CST',
          ],
          [
            'Recargo nocturno',
            'Valor hora × 35% × horas nocturnas trabajadas.',
            'Art. 168 CST',
          ],
          [
            'Trabajo en día de descanso',
            'Valor hora × recargo (80% hasta jun/2026, 90% hasta jun/2027, 100% desde jul/2027).',
            'Art. 179 CST · Ley 2101 de 2021',
          ],
          [
            'Incapacidad común',
            'Días 1-2: 66,67% del salario diario a cargo de la empresa. Del día 3 en adelante: 66,67% a cargo de la EPS.',
            'Art. 227 CST · Ley 100 de 1993 · Decreto 2943 de 2013',
          ],
          [
            'Incapacidad laboral',
            '100% del salario desde el primer día, a cargo de la ARL.',
            'Decreto 1295 de 1994 · Ley 776 de 2002',
          ],
          [
            'Salud empleado',
            '4% del IBC (salario + auxilio en la implementación actual).',
            'Ley 100 de 1993 · Ley 1122 de 2007',
          ],
          [
            'Pensión empleado',
            '4% del IBC.',
            'Ley 100 de 1993 · Ley 797 de 2003',
          ],
          [
            'Retención en la fuente',
            'Según el rango de UVT: (salario − UVT de inicio del rango) × % marginal del rango.',
            'Art. 383 E.T. · Decreto 1070 de 2023',
          ],
          [
            'Seguridad social empleador',
            'Salud 8,5% + pensión 12% del IBC; ARL según clase de riesgo (0,522% a 6,96%); SENA 2%, ICBF 3% y caja de compensación 4% sobre el IBC.',
            'Ley 100 de 1993 · Decreto 1295 de 1994 · Ley 1607 de 2012',
          ],
        ],
      },
      { type: 'title', text: 'Devengados: un ejemplo concreto' },
      {
        type: 'paragraph',
        text: 'Empleado con $1.500.000 de salario que trabajó 15 de los 30 días del período y registró 2 horas extra diurnas: salario base = 1.500.000 × 15/30 = $750.000. Valor hora = 1.500.000 ÷ 240 = $6.250. Extra diurna = 2 × 6.250 × 1,25 = $15.625. Total devengado antes de auxilio y bonos = $765.625.',
      },
      { type: 'title', text: 'Incapacidades: cómo se desglosan' },
      {
        type: 'list',
        items: [
          'Incapacidad común de 10 días con salario de $1.500.000: la empresa paga los primeros 2 días (2 × $50.000 × 66,67% = $66.667) y la EPS cubre los 8 restantes ($266.667).',
          'Incapacidad laboral: el valor completo aparece como cubierto por la ARL; no descuenta días del salario.',
          'Los valores de EPS/ARL se muestran informativos en la nómina; no se suman al neto a pagar porque los paga la entidad, no la empresa.',
        ],
      },
      { type: 'title', text: 'Deducciones' },
      {
        type: 'list',
        items: [
          'Salud y pensión: 4% + 4% del IBC (salario + auxilio en la implementación actual).',
          'Retención en la fuente: tarifa marginal por rangos de UVT definidos en parámetros legales.',
          'Embargos y préstamos: valores manuales que se cargan al editar la nómina en borrador.',
        ],
      },
      { type: 'title', text: 'Seguridad social a cargo del empleador' },
      {
        type: 'list',
        items: [
          'Salud 8,5% y pensión 12% del IBC.',
          'ARL según la clase de riesgo del empleado (1 a 5): 0,522%, 1,044%, 2,436%, 4,35% y 6,96%.',
          'Parafiscales: SENA 2%, ICBF 3% y caja de compensación 4% del IBC. Desde la Ley 1607 de 2012, los empleadores con más de 10 trabajadores están exentos de SENA e ICBF (el sistema aún aplica el 9% completo; consulte con su asesor).',
        ],
      },
      {
        type: 'warning',
        tone: 'warning',
        text: 'Las fórmulas usan la configuración de Parámetros legales vigentes. Verifique UVT, SMMLV, porcentajes y rangos antes de aprobar la nómina. Esta guía es informativa y no constituye asesoría legal.',
      },
      { type: 'title', text: 'Ausencias en la nómina' },
      {
        type: 'paragraph',
        text: 'Los permisos remunerados cuentan como días trabajados (no descuentan). Los permisos sin remunerar descuentan días. Las incapacidades agregan el valor que paga la empresa (días 1-2) y muestran lo que cubren EPS o ARL.',
      },
      { type: 'title', text: 'Recargo por día de descanso (Ley 2101 de 2021)' },
      {
        type: 'table',
        headers: ['Período', 'Recargo'],
        rows: [
          ['Hasta el 30/06/2026', '80%'],
          ['01/07/2026 – 30/06/2027', '90%'],
          ['Desde el 01/07/2027', '100%'],
        ],
      },
      {
        type: 'warning',
        tone: 'warning',
        text: 'Una nómina solo se puede aprobar si todos los empleados tienen asistencia o ausencias remuneradas/incapacidades en el período.',
      },
    ],
    faqs: [
      {
        q: '¿Por qué mi nómina se ve con un día menos?',
        a: 'Es un desfase de zona horaria en registros antiguos. Ejecute la migración de fechas o cree la nómina nuevamente: las nuevas se guardan correctamente.',
      },
      {
        q: '¿Cómo agrego bonificaciones o préstamos?',
        a: 'Abra la nómina en borrador y use la edición de ajustes por empleado.',
      },
      {
        q: '¿Por qué la EPS y la ARL no suman al neto a pagar?',
        a: 'Porque son valores informativos de lo que cubren esas entidades. La empresa solo paga lo que le corresponde (días 1-2 de la incapacidad común).',
      },
      {
        q: '¿Qué es el IBC y cómo se calcula?',
        a: 'Es el Ingreso Base de Cotización: en la implementación actual es salario + auxilio de transporte. Sobre él se calculan salud y pensión.',
      },
      {
        q: '¿Dónde se configuran los porcentajes de la nómina?',
        a: 'En Configuración → Parámetros legales: UVT, salario mínimo, auxilio de transporte, aportes, retenciones y recargos.',
      },
    ],
    related: ['ausencias', 'asistencia', 'configuracion', 'legal', 'marco-legal'],
  },
  {
    id: 'usuarios',
    title: 'Usuarios',
    icon: 'mdi-account-multiple-outline',
    audience: 'gestion',
    category: 'modulos',
    summary: 'Cuentas de acceso, roles e invitaciones.',
    blocks: [
      {
        type: 'paragraph',
        text: 'El módulo Usuarios administra las cuentas de acceso al sistema y sus roles.',
      },
      { type: 'title', text: 'Crear un usuario' },
      {
        type: 'steps',
        items: [
          'En Usuarios presione Nuevo usuario.',
          'Complete nombre, correo y contraseña (mínimo 6 caracteres).',
          'Asigne el rol: administrador, gerente, recursos humanos o empleado.',
          'Guarde. El usuario queda activo.',
        ],
      },
      { type: 'title', text: 'Invitar un usuario' },
      {
        type: 'paragraph',
        text: 'Puede enviar una invitación por correo: el usuario recibe un enlace para definir su propia contraseña.',
      },
      {
        type: 'warning',
        tone: 'info',
        text: 'Un usuario inactivo no puede iniciar sesión. Los cambios de rol surten efecto de inmediato.',
      },
    ],
    faqs: [
      {
        q: '¿Cómo creo un empleado con su cuenta de acceso?',
        a: 'Al crear el empleado elija "Crear cuenta nueva": el sistema crea el usuario con rol empleado y lo vincula.',
      },
    ],
    related: ['empleados', 'roles'],
  },
  {
    id: 'marco-legal',
    title: 'Marco legal laboral colombiano',
    icon: 'mdi-gavel',
    audience: 'gestion',
    category: 'referencia',
    summary: 'Las normas que respaldan los cálculos de la nómina, las ausencias y los recargos.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Esta sección reúne las principales normas colombianas que sustentan los cálculos del sistema. Sirve como referencia para entender el porqué de cada valor; no reemplaza el concepto de un asesor laboral.',
      },
      {
        type: 'table',
        headers: ['Norma', '¿Qué regula?'],
        rows: [
          [
            'Código Sustantivo del Trabajo (CST)',
            'Contrato de trabajo, jornada, horas extras (art. 168-170), recargo nocturno y dominical (art. 168, 179), vacaciones (art. 186-192), cesantías e intereses (art. 249 y ss.), prima de servicios (art. 306).',
          ],
          [
            'Ley 2101 de 2021',
            'Reducción de la jornada máxima a 42 horas semanales y transición del recargo por trabajo en día de descanso: 80% hasta jun/2026, 90% hasta jun/2027 y 100% desde jul/2027.',
          ],
          [
            'Ley 100 de 1993',
            'Sistema de Seguridad Social: salud y pensiones. El empleado cotiza 4% por cada concepto y el empleador 8,5% (salud) y 12% (pensión).',
          ],
          [
            'Decreto 1295 de 1994 · Ley 776 de 2002',
            'Sistema de Riesgos Laborales: la ARL cubre el 100% del salario en incapacidad laboral desde el primer día, según la clase de riesgo del empleado.',
          ],
          [
            'Decreto 2943 de 2013',
            'Regula el pago de la incapacidad común: los primeros 2 días los paga el empleador y del día 3 en adelante la EPS.',
          ],
          [
            'Ley 1607 de 2012',
            'Reforma tributaria: exoneró de aportes parafiscales (SENA e ICBF) a los empleadores con más de 10 trabajadores. El sistema aplica el 9% completo por defecto; consulte a su asesor si aplica la exención.',
          ],
          [
            'Art. 383 Estatuto Tributario · Decreto 1070 de 2023',
            'Retención en la fuente por salarios: tarifas marginales según rangos en UVT.',
          ],
          [
            'Ley 15 de 1959 · Ley 1 de 1963',
            'Auxilio de transporte: se reconoce a quienes ganan hasta 2 SMMLV.',
          ],
          [
            'Decreto 1072 de 2015',
            'Decreto Único Reglamentario del Sector Trabajo: consolida la reglamentación laboral.',
          ],
        ],
      },
      {
        type: 'warning',
        tone: 'info',
        text: 'Las normas cambian y algunas reglas tienen matices según el tamaño de la empresa, el contrato y los convenios. Valide los casos particulares con su asesor laboral o contador.',
      },
    ],
    faqs: [
      {
        q: '¿El sistema aplica automáticamente todos los topes legales?',
        a: 'Aplica los principales: jornada de 42 horas, límites de extras (2 diarias / 12 semanales), recargos transitorios y fórmulas de aportes. Topes como los 25 SMMLV de la EPS y exenciones de parafiscales se pueden ajustar según el caso.',
      },
      {
        q: '¿Dónde veo las normas de cada cálculo?',
        a: 'En la sección Nómina, la tabla "¿Cómo se calcula cada dato?" indica la base legal de cada línea de la liquidación.',
      },
    ],
    related: ['nomina', 'legal', 'ausencias', 'configuracion'],
  },
  {
    id: 'configuracion',
    title: 'Configuración',
    icon: 'mdi-cog-outline',
    audience: 'gestion',
    category: 'procesos',
    summary: 'Empresa, políticas de ausencias y parámetros legales.',
    blocks: [
      {
        type: 'paragraph',
        text: 'En Configuración se administran los datos de la empresa, la jornada, las políticas de ausencias y los parámetros legales (UVT, SMMLV, aportes y retenciones).',
      },
      { type: 'title', text: 'Empresa y jornada' },
      {
        type: 'list',
        items: [
          'Datos básicos: nombre, NIT, dirección y régimen tributario.',
          'Jornada: horas máximas semanales (42), horas mínimas/máximas diarias y ventana nocturna.',
        ],
      },
      { type: 'title', text: 'Políticas de ausencias' },
      {
        type: 'list',
        items: [
          'Días máximos por tipo de permiso al año (médico, calamidad, luto, matrimonio, sin remunerar...).',
          'Días de incapacidad común pagados por la empresa (por defecto 2).',
          'Recargo por día de descanso (vacío = tabla legal 80/90/100%).',
          'Exigir soporte documental para aprobar ausencias.',
        ],
      },
      { type: 'title', text: 'Parámetros legales' },
      {
        type: 'steps',
        items: [
          'En Parámetros legales presione Nuevo período.',
          'Registre UVT, salario mínimo, auxilio de transporte, aportes, retenciones, tarifas ARL, parafiscales, incapacidad común y horas base del mes.',
          'Active el período cuando esté listo: queda como vigente y el anterior pasa a histórico.',
        ],
      },
      {
        type: 'warning',
        tone: 'success',
        text: 'Cuando cambien las tarifas (normalmente cada año, con el nuevo SMMLV y UVT), cree un período nuevo con los valores actualizados y actívelo. Así las nóminas usan siempre los valores vigentes y el historial queda documentado.',
      },
      {
        type: 'warning',
        tone: 'warning',
        text: 'Sin parámetros legales vigentes no se puede crear una nómina.',
      },
    ],
    faqs: [
      {
        q: '¿Cómo cambio el día de descanso de un empleado?',
        a: 'El día de descanso se configura en la ficha del empleado y se usa para calcular días hábiles y recargos.',
      },
    ],
    related: ['nomina', 'ausencias', 'legal'],
  },
  {
    id: 'reportes',
    title: 'Reportes',
    icon: 'mdi-chart-bar',
    audience: 'gestion',
    category: 'modulos',
    summary: 'Dashboard con indicadores de headcount, nómina, ausentismo y asistencia.',
    blocks: [
      {
        type: 'paragraph',
        text: 'El dashboard de Reportes muestra los indicadores clave de recursos humanos para el mes seleccionado.',
      },
      { type: 'title', text: 'Indicadores disponibles' },
      {
        type: 'list',
        items: [
          'Colaboradores: total, activos y distribución por tipo de contrato.',
          'Nómina: devengado, deducido, seguridad social y neto del mes, más la evolución de los últimos 6 meses.',
          'Ausencias: días aprobados por tipo y días de incapacidad del mes.',
          'Asistencia: horas ordinarias, extras diurnas y nocturnas, recargo nocturno y registros.',
        ],
      },
      { type: 'title', text: 'Filtrar por mes y año' },
      {
        type: 'steps',
        items: [
          'Use los selectores de mes y año en la cabecera.',
          'Presione Actualizar para recalcular los indicadores.',
          'Los gráficos se actualizan automáticamente con el período elegido.',
        ],
      },
      {
        type: 'warning',
        tone: 'info',
        text: 'Los indicadores de desempeño, rotación y reclutamiento se incorporarán cuando estén disponibles los módulos de Evaluación de Desempeño y Reclutamiento.',
      },
    ],
    related: ['nomina', 'ausencias', 'soporte'],
  },
  {
    id: 'perfil',
    title: 'Mi perfil',
    icon: 'mdi-account-circle-outline',
    audience: 'todos',
    category: 'referencia',
    summary: 'Tus datos personales y el cambio de contraseña.',
    blocks: [
      { type: 'title', text: 'Cambiar mi contraseña' },
      {
        type: 'steps',
        items: [
          'Entre a Mi perfil.',
          'Use la sección "Cambiar contraseña".',
          'Ingrese la contraseña actual y la nueva (mínimo 6 caracteres).',
          'Guarde: la sesión se mantiene activa.',
        ],
      },
    ],
    faqs: [
      {
        q: '¿Puedo cambiar mi correo?',
        a: 'El correo lo administra el administrador del sistema. Solicite el cambio si es necesario.',
      },
    ],
    related: ['inicio', 'soporte'],
  },
  {
    id: 'soporte',
    title: 'Solución de problemas',
    icon: 'mdi-wrench-outline',
    audience: 'todos',
    category: 'referencia',
    summary: 'Problemas comunes y cómo resolverlos.',
    blocks: [
      {
        type: 'table',
        headers: ['Problema', 'Solución'],
        rows: [
          ['No puedo iniciar sesión', 'Verifique correo y contraseña. Si la olvidó, contacte al administrador.'],
          ['No veo un módulo', 'Su rol no tiene permiso. Solicite el rol adecuado al administrador.'],
          ['Una fecha se ve con un día menos', 'Registros antiguos con desfase UTC. Ejecute la migración de fechas o recree el registro.'],
          ['La página se ve rara o vacía', 'Recargue con Ctrl+Shift+R (sin caché) y verifique su conexión.'],
          ['No puedo aprobar la nómina', 'Verifique que todos los empleados tengan asistencia o ausencias remuneradas en el período.'],
          ['Una ausencia no se puede editar', 'Solo las ausencias pendientes se editan o eliminan.'],
        ],
      },
      {
        type: 'warning',
        tone: 'info',
        text: 'Si el problema persiste, reporte al administrador: qué pantalla estaba viendo, qué acción hizo y el mensaje exacto del error.',
      },
    ],
    faqs: [
      {
        q: '¿Los cambios se guardan solos?',
        a: 'No: los cambios se guardan al presionar Guardar, Crear o Aprobar.',
      },
    ],
    related: ['inicio', 'roles'],
  },
  {
    id: 'legal',
    title: 'Parámetros legales',
    icon: 'mdi-scale-balance',
    audience: 'gestion',
    category: 'referencia',
    summary: 'UVT, salario mínimo, aportes y recargos vigentes.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Los parámetros legales definen las bases de cálculo de la nómina: valor UVT, salario mínimo mensual, auxilio de transporte, porcentajes de salud y pensión, recargos y retención en la fuente.',
      },
      { type: 'title', text: 'Períodos y vigencia' },
      {
        type: 'list',
        items: [
          'Cada período tiene una fecha de vigencia y solo uno está activo a la vez.',
          'Los períodos anteriores quedan como histórico.',
          'La nómina usa los parámetros vigentes al momento de liquidar.',
        ],
      },
    ],
    related: ['nomina', 'configuracion', 'marco-legal'],
  },
  {
    id: 'calendario',
    title: 'Calendario de ausencias',
    icon: 'mdi-calendar-month-outline',
    audience: 'gestion',
    category: 'modulos',
    summary: 'Vista mensual de permisos, licencias e incapacidades.',
    blocks: [
      {
        type: 'paragraph',
        text: 'El calendario muestra las ausencias del mes con su estado: verde para aprobadas, naranja para pendientes y rojo para rechazadas.',
      },
      { type: 'title', text: 'Navegar el calendario' },
      {
        type: 'steps',
        items: [
          'Abra Ausencias → Calendario.',
          'Cambie de mes con las flechas del calendario.',
          'Haga clic en un evento para abrir el detalle de la ausencia.',
        ],
      },
    ],
    related: ['ausencias'],
  },
]

export const getHelpSection = (id: string | null): HelpSection | undefined =>
  helpSections.find((section) => section.id === id)
