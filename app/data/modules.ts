// ============================================================
// Páginas públicas de módulos (marketing / ventas)
// Contenido orientado a mostrar el software de forma profesional,
// con referencia a la normativa laboral colombiana aplicable.
// ============================================================

export interface SuiteModule {
  slug: string
  title: string
  icon: string
  tagline: string
  summary: string
  description: string[]
  features: string[]
  legal: { source: string; text: string }[]
  screenshot?: string
  color: string
}

export const modules: SuiteModule[] = [
  {
    slug: 'empleados',
    title: 'Gestión de empleados',
    icon: 'mdi-account-group-outline',
    tagline: 'El expediente digital de cada persona de tu equipo, siempre al día.',
    summary:
      'Centraliza datos personales, cargo, salario, tipo de contrato, turno y estado de cada colaborador en una sola ficha.',
    description: [
      'Cada empleado tiene una ficha única donde se concentra toda su información: datos de identificación, cargo, salario, tipo de contrato, turno asignado, fecha de ingreso y estado actual. Desde ahí se gestiona su ciclo completo de vida en la empresa.',
      'El sistema mantiene el historial de vinculación: ingresos, salidas, motivos de retiro y reingresos, de modo que nunca se pierde la trazabilidad aunque una persona haya trabajado en la empresa en varios períodos.',
    ],
    features: [
      'Ficha de empleado con datos personales, contacto y documentos.',
      'Cargo, salario base, tipo de contrato y clase de riesgo ARL.',
      'Asignación de turno fijo o rotativo desde la misma ficha.',
      'Historial de vinculación, salidas y reingresos.',
      'Búsqueda rápida por documento, nombre o cargo.',
      'Control por roles: quién puede ver o editar cada dato.',
    ],
    legal: [
      {
        source: 'Código Sustantivo del Trabajo, art. 57',
        text: 'Obligaciones del empleador de llevar y conservar los datos del trabajador y su historia laboral.',
      },
      {
        source: 'Ley 1581 de 2012',
        text: 'Protección de datos personales: el expediente del empleado se gestiona bajo los principios de finalidad, necesidad y confidencialidad.',
      },
    ],
    screenshot: '/screenshots/empleados.webp',
    color: '#3B82F6',
  },
  {
    slug: 'turnos',
    title: 'Turnos y horarios',
    icon: 'mdi-calendar-clock-outline',
    tagline: 'Turnos fijos y rotativos con validación legal de la jornada.',
    summary:
      'Define la operación por turnos y verifica automáticamente que las jornadas cumplan los límites legales.',
    description: [
      'Configura turnos fijos o rotativos con horarios de entrada y salida, jornadas partidas y días de trabajo por semana. Cada empleado se asigna a su turno y el sistema calcula las horas programadas.',
      'La validación legal está integrada: se controlan las 42 horas semanales máximas, la jornada diaria entre 6 y 9 horas y el día de descanso obligatorio, con alertas cuando una programación excede los límites.',
    ],
    features: [
      'Turnos fijos y rotativos por empleado.',
      'Jornadas partidas con rangos de tiempo (ej. almuerzo).',
      'Día de descanso semanal configurable por empleado.',
      'Validación automática de jornada diaria y semanal.',
      'Vista de calendario con la programación del mes.',
      'Alertas al superar los límites legales de horas.',
    ],
    legal: [
      {
        source: 'Ley 2101 de 2021',
        text: 'Jornada máxima de 42 horas semanales con transición gradual; reduce la jornada sin afectar el salario.',
      },
      {
        source: 'Código Sustantivo del Trabajo, arts. 161 a 166',
        text: 'Definen la jornada ordinaria (máximo 8 horas diarias y 48 semanales, hoy reducida por la Ley 2101) y el día de descanso obligatorio.',
      },
    ],
    color: '#48A9A6',
  },
  {
    slug: 'asistencia',
    title: 'Asistencia y horas extras',
    icon: 'mdi-clock-in',
    screenshot: '/screenshots/asistencias.webp',
    tagline: 'Registros de entrada y salida con recargos legales automáticos.',
    summary:
      'Controla la asistencia diaria y calcula horas extras diurnas y nocturnas con los recargos de la ley.',
    description: [
      'Cada marcación de entrada y salida queda registrada con su fecha y hora. El sistema calcula las horas trabajadas, separa la jornada diurna de la nocturna y detecta automáticamente las horas extras.',
      'Los recargos se aplican según la normativa vigente: hora extra diurna, hora extra nocturna, recargo nocturno y trabajo en día de descanso, todo configurable por año dentro de los parámetros legales.',
    ],
    features: [
      'Registro de entradas y salidas por empleado y día.',
      'Cálculo de horas diurnas, nocturnas y horas extras.',
      'Recargos legales aplicados automáticamente (25%, 35%, 75%, 100%).',
      'Límite de 12 horas extras semanales con alerta.',
      'Asistencia diaria y heatmap por empleado en reportes.',
      'Novedades aprobadas integradas con la nómina.',
    ],
    legal: [
      {
        source: 'Código Sustantivo del Trabajo, arts. 168 a 171',
        text: 'Recargos: hora extra diurna 25%, nocturna 75% y recargo nocturno 35%.',
      },
      {
        source: 'Código Sustantivo del Trabajo, art. 172',
        text: 'Límite máximo de 12 horas extras semanales para trabajo suplementario.',
      },
      {
        source: 'Ley 2101 de 2021, art. 3',
        text: 'Ajusta el recargo por trabajo en día de descanso obligatorio (80% → 90% → 100%) durante la transición.',
      },
    ],
    color: '#FB8C00',
  },
  {
    slug: 'ausencias',
    title: 'Ausencias y permisos',
    icon: 'mdi-calendar-edit-outline',
    tagline: 'Licencias, permisos e incapacidades con aprobación y política por año.',
    summary:
      'Gestiona los tipos de ausencia que reconoce la ley y controla los días disponibles de cada colaborador.',
    description: [
      'El módulo cubre los tipos de ausencia más comunes: permisos médicos, citaciones, calamidad doméstica, luto, matrimonio, licencia escolar, incapacidades común y laboral, vacaciones, descansos compensatorios y permisos sin remunerar.',
      'Cada ausencia se solicita, aprueba y registra con su fecha de inicio, fin y días calculados. El sistema valida la política por año y refleja el impacto en nómina según el tipo de licencia (remunerada o no).',
    ],
    features: [
      '12+ tipos de licencia, permiso e incapacidad.',
      'Flujo de solicitud y aprobación con trazabilidad.',
      'Cálculo de días hábiles y calendario de la ausencia.',
      'Política de días por año configurable.',
      'Ausencias justificadas visibles en asistencia y heatmap.',
      'Impacto automático en la liquidación de nómina.',
    ],
    legal: [
      {
        source: 'Código Sustantivo del Trabajo, arts. 57.6, 57.7 y 57.8',
        text: 'Licencias remuneradas por luto, calamidad doméstica y otras causas justificadas.',
      },
      {
        source: 'Ley 1280 de 2009',
        text: 'Licencia remunerada por matrimonio (5 días hábiles).',
      },
      {
        source: 'Ley 1862 de 2017',
        text: 'Permiso remunerado para ejercer el derecho al voto.',
      },
    ],
    screenshot: '/screenshots/ausencias.webp',
    color: '#7C3AED',
  },
  {
    slug: 'nomina',
    title: 'Liquidación de nómina',
    icon: 'mdi-cash-multiple',
    tagline: 'Devengados, deducciones y seguridad social con parámetros legales actualizables.',
    summary:
      'Liquida la nómina del período con cálculos automatizados y parámetros legales configurables por año.',
    description: [
      'La nómina se calcula a partir de los datos del empleado (salario, contrato, ARL), la asistencia del período, las horas extras y las ausencias aprobadas. El sistema separa devengados, deducciones y aportes a seguridad social con totales verificables.',
      'Los porcentajes y valores legales —SMMLV, recargos, tarifas EPS, pensión, ARL, parafiscales— son configurables y versionados por año, de modo que los cálculos se actualizan sin tocar código cuando cambia la norma.',
    ],
    features: [
      'Devengados: salario, horas extras, recargos, auxilio de transporte.',
      'Deducciones: préstamos, libranzas y aportes del trabajador.',
      'Seguridad social: EPS, pensión y ARL por empleado.',
      'Parafiscales: SENA, ICBF y caja de compensación.',
      'Estados de nómina: borrador, aprobada y pagada.',
      'Parámetros legales configurables y versionados por año.',
    ],
    legal: [
      {
        source: 'Código Sustantivo del Trabajo, arts. 127 a 149',
        text: 'Definen salario, recargos, auxilio de transporte y prestaciones a cargo del empleador.',
      },
      {
        source: 'Ley 100 de 1993',
        text: 'Sistema de seguridad social: aportes a EPS, pensión y ARL con tarifas por tipo de riesgo.',
      },
      {
        source: 'Ley 1607 de 2012',
        text: 'Aportes parafiscales (SENA, ICBF, caja de compensación) según el tamaño de la empresa.',
      },
    ],
    screenshot: '/screenshots/nomina-detalle.webp',
    color: '#1867C0',
  },
  {
    slug: 'prestamos',
    title: 'Préstamos y descuentos',
    icon: 'mdi-hand-coin-outline',
    tagline: 'Préstamos a empleados con descuento automático en nómina.',
    summary:
      'Administra préstamos internos, cuotas y saldos pendientes, descontados de forma automática en cada liquidación.',
    description: [
      'Registra préstamos otorgados a colaboradores con su monto, número de cuotas e interés si aplica. El sistema calcula el valor de la cuota y lo descuenta automáticamente de la nómina de cada período.',
      'Lleva el control del saldo pendiente y el historial de abonos, de modo que la conciliación entre el módulo de préstamos y la nómina es siempre consistente.',
    ],
    features: [
      'Préstamos por empleado con monto y cuotas.',
      'Cálculo automático de cuota e intereses.',
      'Descuento automático en cada nómina.',
      'Saldo pendiente y estado del préstamo.',
      'Historial de abonos y amortización.',
      'Límites de endeudamiento configurables.',
    ],
    legal: [
      {
        source: 'Código Sustantivo del Trabajo, art. 149',
        text: 'Regula los descuentos permitidos al salario, incluidos los autorizados por el trabajador.',
      },
      {
        source: 'Ley 1527 de 2012',
        text: 'Marco de las libranzas y descuentos nómina para créditos autorizados.',
      },
    ],
    color: '#16A34A',
  },
  {
    slug: 'reportes',
    title: 'Reportes y estadísticas',
    icon: 'mdi-chart-bar',
    tagline: 'Indicadores de gestión humana para decidir con datos.',
    summary:
      'Dashboard con KPIs, evolución de nómina, ausentismo, heatmap de asistencia y exportación de datos.',
    description: [
      'El dashboard consolida los indicadores del período: nómina total y neta, variación mensual, ausentismo, incapacidades, horas extras, rotación y estructura de la plantilla. Todo se calcula sobre datos reales del sistema.',
      'Los gráficos muestran la evolución de los últimos 12 meses, la asistencia diaria, el heatmap por empleado y el top de ausencias. La información se puede exportar a CSV para análisis externo o presentaciones.',
    ],
    features: [
      'KPIs: nómina, ausentismo, incapacidades, horas extras, rotación.',
      'Evolución de nómina con estados borrador, aprobada y pagada.',
      'Heatmap de asistencia empleado × día.',
      'Distribución de ausencias por tipo.',
      'Exportación de indicadores a CSV.',
      'Alertas operativas en tiempo real (SSE).',
    ],
    screenshot: '/screenshots/dashboard1.webp',
    color: '#0EA5E9',
  },
  {
    slug: 'contratos',
    title: 'Historial y contratos',
    icon: 'mdi-file-document-multiple-outline',
    tagline: 'Períodos de vinculación, reingresos y contratos con historial completo.',
    summary:
      'Conserva la trazabilidad de ingresos y salidas y gestiona los documentos contractuales y sus renovaciones.',
    description: [
      'El historial de vinculación registra cada período en que una persona estuvo en la empresa: fecha de ingreso, salida, motivo y estado. Si el colaborador regresa, se crea un nuevo período sin perder el anterior.',
      'El módulo de contratos añade la gestión documental: contrato inicial, renovaciones, modificaciones y vencimientos, todo asociado al período de vinculación correspondiente.',
    ],
    features: [
      'Historial de vinculación con reingresos.',
      'Motivos de retiro y certificación laboral.',
      'Contratos con fechas de inicio y vencimiento.',
      'Renovaciones y modificaciones contractuales.',
      'KPI de rotación basado en períodos terminados.',
      'Base para el módulo de reclutamiento y selección.',
    ],
    legal: [
      {
        source: 'Código Sustantivo del Trabajo, art. 46',
        text: 'Contrato a término fijo: duración, prórrogas y terminación por vencimiento del plazo.',
      },
      {
        source: 'Código Sustantivo del Trabajo, arts. 47 y 48',
        text: 'Obligación de formalizar el contrato de trabajo y sus condiciones por escrito.',
      },
    ],
    color: '#64748B',
  },
  {
    slug: 'roles',
    title: 'Control por roles',
    icon: 'mdi-shield-account-outline',
    tagline: 'Permisos granulares para cada perfil de la organización.',
    summary:
      'Administrador, gerencia, recursos humanos y empleados con accesos definidos a cada módulo y acción.',
    description: [
      'Cada usuario pertenece a un rol que define qué módulos puede ver y qué acciones puede ejecutar: creación, edición, aprobación o solo consulta. Esto protege la información sensible y ordena la operación.',
      'El administrador centraliza la creación de usuarios, la asignación de roles y la auditoría de acciones en el sistema.',
    ],
    features: [
      'Roles: administrador, gerente, RRHH y empleado.',
      'Permisos por módulo y por acción.',
      'Auditoría de acciones de los usuarios.',
      'Autoservicio del empleado para consultar su información.',
      'Seguridad multi-tenant: cada empresa aislada.',
      'Bloqueo y reactivación de cuentas.',
    ],
    legal: [
      {
        source: 'Ley 1581 de 2012',
        text: 'Acceso restringido y confidencialidad de los datos personales según el principio de necesidad.',
      },
    ],
    color: '#DB2777',
  },
  {
    slug: 'evaluaciones',
    title: 'Evaluación de desempeño',
    icon: 'mdi-clipboard-check-outline',
    tagline: 'Plantillas configurables por cargo con ciclo controlado por RRHH.',
    summary:
      'Evalúa el desempeño con plantillas por cargo, control de ciclo y alcance, historial de configuración y PDF profesional.',
    description: [
      'Las evaluaciones se construyen con plantillas configurables por cargo: cada sección tiene un peso (%) y sus items o criterios, y solo hay una plantilla activa por cargo.',
      'RRHH controla el ciclo completo: frecuencia y fechas, a quién se evalúa (todas las áreas o áreas específicas) y quién evalúa (jefe directo o asignación manual). Cada cambio de configuración queda versionado con usuario, fecha y motivo.',
      'El flujo va de borrador a completada y aprobada (bloqueada), con puntaje 0–100, nivel cualitativo y un PDF profesional con el logo de la empresa.',
    ],
    features: [
      'Plantillas por cargo con secciones ponderadas.',
      'Campañas con nombre, estado y fechas del ciclo.',
      'Alcance por área o todas las áreas.',
      'Evaluador: jefe directo o asignación manual.',
      'Generación en lote: plantilla por cargo, evaluador automático y sin duplicados.',
      'Dashboard de campaña: avance, promedio y distribución.',
      'Historial de configuración y auditoría.',
      'PDF profesional con logo de la empresa.',
    ],
    legal: [
      {
        source: 'Buenas prácticas de gestión humana',
        text: 'Evaluaciones con criterios claros, trazabilidad de decisiones y respeto a la confidencialidad de los resultados.',
      },
    ],
    color: '#6366F1',
  },
]

export const getModule = (slug: string): SuiteModule | undefined =>
  modules.find((module) => module.slug === slug)
