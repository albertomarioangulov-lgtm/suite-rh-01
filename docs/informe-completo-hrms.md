# INFORME COMPLETO — SISTEMA DE GESTIÓN DE RECURSOS HUMANOS (HRMS)

> Documento fuente para Gemini Notebook: resume el estado del proyecto, la arquitectura, la auditoría para propuestas comerciales, el sistema de licencias y la hoja de ruta.

**Fecha:** 2026-08-29
**Proyecto principal:** `nomina-app-01`
**Proyectos auxiliares:** `nuxt-starter` (plantilla base) · `licencias-app-01` (sistema de licencias)

---

## 1. RESUMEN EJECUTIVO

El proyecto es un **HRMS multi-tenant** construido con Nuxt 4, Vuetify 4, MongoDB y TypeScript. Cubre: gestión de empleados, turnos fijos y rotativos, asistencia con horas extras y límites legales (Ley 2101 de 2021), ausencias y permisos (incluidas las licencias de la reforma laboral), nómina, préstamos, dashboard analítico, centro de ayuda y alertas en tiempo real.

La arquitectura permite **una sola base de datos con aislamiento por `tenantId`**, usuarios con roles y múltiples empresas, feature flags por tenant y un sistema de licencias centralizado (proyecto aparte) que controla qué módulos tiene habilitado cada cliente.

Lo que un cliente potencial normalmente pide (empleados, turnos, horas extras) está **completo y demostrable**. La nómina funciona; lo pendiente es el XML de nómina electrónica y el portal de autoservicio para empleados.

---

## 2. ARQUITECTURA TÉCNICA

### 2.1 Stack

| Capa | Tecnología |
| :--- | :--- |
| Framework | Nuxt 4 (Nitro en server) |
| UI | Vuetify 4 + Material Design Icons |
| Gráficos | ECharts (vue-echarts) |
| Base de datos | MongoDB (Mongoose 9) |
| Autenticación | `nuxt-auth-utils` (sesión sellada en cookie) |
| Validación | Zod (backend) + reglas Vuetify (frontend) |
| Fechas | dayjs (siempre) |
| Estado | `useState` (sin Pinia) |
| Versionado de API | `/api/v1/` |

### 2.2 Estructura del proyecto

```
app/
  components/        # Reutilizables: common/, layout/, employees/, shift/, payroll/, absence/, loan/, dashboard/
  composables/
    states/          # useXState (useState, sin Pinia): auth, employee, attendance, absence, payroll, shift, loan, analytics, feature-flags, help
    useHelp.ts       # Centro de ayuda contextual
    useModuleGuard.ts# Protección de páginas por feature flag
  layouts/           # default, login, landing
  middleware/        # auth, not-authenticated
  pages/             # admin/* (empleados, turnos, asistencia, ausencias, nómina, préstamos, configuración, reportes)
  plugins/           # vuetify, echarts
  utils/             # api-paths, validation-rules, number-helpers, export-helpers
server/
  api/v1/            # Rutas versionadas por módulo
  api/events.get.ts  # SSE de alertas
  middleware/        # cors, csrf, session, tenant
  models/            # User, Company, Employee, Attendance, Shift, Absence, Payroll, Alert, AlertConfig, Loan, LegalParams, AuditLog
  services/          # Lógica de negocio (payroll, attendance, absence, shift, loan, analytics, feature-flags)
  utils/             # authorize, tenant, validation-schemas, audit, alert-stream
shared/              # auth (roles), absence (tipos), feature-flags, datetime-helpers
scripts/             # Seeds y migraciones
tests/               # Vitest
```

### 2.3 Multi-tenant

- Todos los modelos de dominio usan **`tenantId`** (ref Company).
- `User` tiene `tenantIds` (array) y `tenantActivo`.
- Middleware `tenant.ts` inyecta el tenant de la sesión en `event.context.tenantId`.
- Helpers: `getTenantId(event)`, `addTenantFilter(event, filter)`, `syncUserTenants(userId)`.
- Las rutas filtran por el tenant del usuario; **no queda ninguna ruta usando empresa global**.
- Selector de empresa en el AppBar cuando el usuario pertenece a varias.

### 2.4 Feature flags y licencias

- Catálogo: `shared/feature-flags.ts` (employees, attendance, shifts, absences, payroll, loans, analytics, performance, recruitment, self_service).
- `TenantConfig` guarda qué flags están activos por tenant.
- `requireFlag(event, roles, flag)` protege rutas (403 si el módulo está desactivado).
- `useModuleGuard` redirige al inicio si la página de un módulo está desactivada.
- El contrato `isFlagEnabled(tenantId, flag)` es el punto donde se conecta el licenciador externo.

### 2.5 Seguridad

- Roles: `admin`, `manager`, `hr`, `employee` (+ `superadmin` en el proyecto de licencias).
- `authorize(event, roles)` valida sesión + rol + usuario activo contra la BD.
- CSRF, CORS con allowlist, rate-limit en login.
- Contraseñas con bcrypt; campos sensibles excluidos del JSON.
- Feature flags como control de acceso a módulos.

---

## 3. AUDITORÍA DE FUNCIONALIDADES (PARA PROPUESTA COMERCIAL)

### 3.1 Módulo de Empleados — ✅ Implementado

- CRUD completo (`/api/v1/employees`, 7 rutas).
- Campos: documento, nombre, email, fecha de ingreso, tipo de contrato (indefinido/fijo/obra/intern), salario base, cargo, clase de riesgo ARL, día de descanso, turno asignado, estado.
- Relación con usuarios (vincular o crear cuenta con rol empleado).
- Búsqueda, filtro por estado, paginación, vista tabla/tarjetas.
- Ficha de empleado tipo dashboard: KPIs, asistencia reciente, ausencias con aprobación desde ahí.

### 3.2 Módulo de Turnos — ✅ Implementado

- Turnos **fijos y rotativos** (`fixed` / `rotating`; rotativo exige 7 días).
- Rangos por día (jornada partida con almuerzo soportada).
- Validación legal: **6–9 h diarias, máximo 42 h semanales** (Ley 2101).
- Asignación a empleados (individual y masiva), calendario semanal.
- Total de horas semanales recalculado automáticamente.

### 3.3 Módulo de Asistencia y Horas Extras — ✅ Implementado

- Registro de entrada/salida con cálculo automático:
  - Horas diurnas / nocturnas (ventana nocturna configurable, ej. 19:00–06:00).
  - Horas extra diurnas **+25%** y nocturnas **+75%**.
  - Recargo nocturno **35%**.
- Límites legales: **2 h extra diarias, 12 h semanales** (validación + alertas).
- Alertas en tiempo real (SSE) cuando se superan los límites; campana con badge en el AppBar.
- Resumen semanal y mensual por empleado.
- Un solo registro por empleado y día (evita duplicados).

### 3.4 Módulo de Nómina — ✅ Implementado (falta XML)

- Liquidación por período (borrador → aprobada → pagada / anulada).
- Devengados: salario prorrateado por días, auxilio de transporte (<2 SMMLV), extras, recargos, bonificaciones, comisiones, valores de incapacidad (empresa/EPS/ARL).
- Deducciones: salud 4%, pensión 4%, retención en la fuente por rangos UVT, embargos, préstamos.
- Seguridad social empleador: salud 8,5%, pensión 12%, ARL por clase de riesgo, parafiscales (SENA/ICBF/caja) — todo **configurable por período** en parámetros legales.
- Préstamos a empleados con cuota automática y protección anti-doble descuento.
- Recalcular desde asistencia, ajustes manuales, auditoría.
- **Pendiente: ❌ XML de nómina electrónica (CEN)** — estimación 3–5 días.

### 3.5 Ausencias, Permisos e Incapacidades — ✅ Implementado

- 12 tipos: Permiso Médico, Escolar, Legal, Bicicleta, Calamidad Doméstica, Luto, Matrimonio, Incapacidad Común, Incapacidad Laboral, Vacaciones, Sin Remunerar, Descanso Compensatorio.
- Aprobación/rechazo con motivo, política anual por tipo (configurable), soporte documental.
- Incapacidad común: empresa paga días 1–2 (66,67%), EPS desde el día 3; laboral: ARL 100%.
- Descanso compensatorio y recargos por día de descanso (80% → 90% → 100% según Ley 2101).
- Vista de calendario mensual y gestión desde la ficha del empleado.

### 3.6 Dashboard / Reportes — ✅ Implementado

- KPIs con variación mes a mes: headcount, nómina neta, tasa de ausentismo, horas, alertas.
- Gráficos ECharts: evolución de nómina (12 meses), heatmap de asistencia, gauge de horas extras (límite 12 h), top 5 ausencias, distribución por contrato/cargo, asistencia diaria.
- Nómina por empleado (tabla), resumen de incapacidades, filtros de mes/año.
- Alertas en vivo con SSE y campana (badge + lista + marcar leída).
- Exportación a CSV.

### 3.7 Centro de Ayuda — ✅ Implementado

- Manual estructurado por módulo (14+ secciones), con pasos, tablas, avisos y FAQ.
- Ayuda contextual por página (botón "?" en la barra superior).
- Sección de marco legal laboral colombiano.

### 3.8 Portal de Autoservicio — ❌ Pendiente

- Empleados solicitan permisos y consultan su información sin RRHH.
- **Estimación: 3–4 días.**

### 3.9 Multi-tenant y licencias — ✅ Implementado (interno)

- Aislamiento por `tenantId`, usuarios multi-empresa, selector de empresa.
- Sistema de licencias centralizado en proyecto aparte (ver sección 5).

### 3.10 Evaluación de desempeño — ✅ Implementado

- **Plantillas configurables por cargo**: secciones con peso (%) e items, una activa por cargo.
- **Control por RRHH**: parámetros generales (frecuencia y fechas por defecto) y **campañas de evaluación** — ciclos planificados con nombre, estado (borrador/activa/cerrada), fechas, alcance (todas las áreas o áreas específicas), regla de evaluador (jefe directo o asignación manual) y autoevaluación opcional.
- **Generación masiva**: desde una campaña se crean en lote las evaluaciones del alcance (plantilla activa por cargo, evaluador según la regla), idempotente y con conteo de omitidas.
- **Dashboard de campaña**: KPIs (totales, realizadas, pendientes, promedio), barra de avance, donut de estado, promedio por área y distribución por nivel.
- **Trazabilidad**: cada cambio de configuración queda versionado (snapshot antes/después, usuario, comentario); la creación y aprobación de evaluaciones queda en la auditoría.
- **Flujo**: borrador → completada → aprobada (bloqueada), puntaje 0–100 con nivel cualitativo y **PDF profesional** (logo de la empresa + Suite RH en el pie).

---

## 4. MATRIZ DE FUNCIONALIDADES

| Funcionalidad | Estado | Observación |
| :--- | :--- | :--- |
| Gestión de empleados | ✅ Implementado | CRUD completo, filtros, relación con usuarios, ficha profesional |
| Gestión de turnos | ✅ Implementado | Fijos y rotativos, validación 6–9 h / 42 h, calendario semanal |
| Horas extras y recargos | ✅ Implementado | 25% diurna, 75% nocturna, 35% nocturno, límites 2 h / 12 h |
| Alertas de límites | ✅ Implementado | SSE en vivo + campana con badge |
| Liquidación de nómina | ✅ Implementado | Devengados, deducciones, seguridad social, estados |
| Nómina electrónica (XML) | ❌ Pendiente | Cálculo listo; falta generar XML/CEN (3–5 días) |
| Préstamos a empleados | ✅ Implementado | Cuotas automáticas en nómina, historial |
| Ausencias y permisos | ✅ Implementado | 12 tipos incl. reforma laboral, aprobación, calendario |
| Multi-tenant | ✅ Implementado | tenantId + tenantActivo + middleware |
| Roles y seguridad | ✅ Implementado | 4 roles, rutas protegidas, feature flags |
| Dashboard analítico | ✅ Implementado | ECharts, KPIs, heatmap, gauge, export CSV |
| Portal de autoservicio | ❌ Pendiente | Empleado solicita permisos y ve recibos (3–4 días) |
| Centro de ayuda | ✅ Implementado | Manual por módulo, ayuda contextual |
| Organización (áreas, cargos y organigrama) | ✅ Implementado | Catálogo de áreas/cargos con funciones, jefes directos, organigrama (árbol + sunburst) |
| Evaluación de desempeño | ✅ Implementado | Plantillas por cargo, campañas con generación masiva, dashboard por campaña, historial y PDF |
| Contratos e historial de vinculación | ✅ Implementado | Períodos, reingresos, renovaciones y listado de contratos |
| Landing pública y contacto | ✅ Implementado | Módulos, precios, FAQ, seguridad, contacto con anti-spam y SEO |
| Sistema de licencias | ✅ Implementado (interno) | Proyecto aparte: productos, clientes, claves, validación |

---

## 5. SISTEMA DE LICENCIAS (PROYECTO `licencias-app-01`)

### 5.1 Concepto

Sistema centralizado para administrar **licencias de varios softwares** para varios clientes (mini-Zentitle). Cada software registrado como producto; cada cliente recibe una licencia con módulos habilitados, límite de usuarios (seats) y vigencia.

### 5.2 Modelos

- **Product**: nombre, slug único, versión, módulos que ofrece.
- **Client**: nombre, NIT, contacto.
- **License**: producto + cliente, `licenseKey` única (XXXX-XXXX-XXXX-XXXX), plan (basic/professional/enterprise), `enabledModules`, `maxSeats`, `validFrom`, `validUntil`, `graceDays`, estado (active/expired/suspended/cancelled), historial de renovaciones.

### 5.3 API

- Admin (`/api/v1`): CRUD de productos, clientes y licencias + renovación.
- **Pública**: `POST /api/public/licenses/validate` `{ licenseKey, module }` → `{ valid, reason, expiresAt, seats }`.

### 5.4 Integración con el HRMS

- `isFlagEnabled(tenantId, flag)` es el punto único donde el HRMS consulta la licencia.
- Recomendado: validación por **HTTP** (el software guarda su `licenseKey` y llama al servicio central), con caché de la respuesta y revalidación cerca del vencimiento.
- Cada cliente desplegado usa su licencia para activar/desactivar módulos (feature flags).

### 5.5 Plantilla reutilizable (`nuxt-starter`)

- Proyecto base limpio (auth + multi-tenant + feature flags + Vuetify) para clonar en nuevos softwares.
- El sistema de licencias se construyó sobre una copia del starter, que queda intacta como plantilla.

---

## 6. RECOMENDACIONES PARA LA PROPUESTA COMERCIAL

### 6.0 Estrategia de precios (ejemplo)

Modelo recomendado: **suscripción base + costo por empleado activo** (seats), con planes escalonados y licencias gestionadas por el sistema de licencias.

| Plan | Base mensual | Por empleado | Implementación (único) |
| :--- | :--- | :--- | :--- |
| Básico (sin nómina) | $120.000 (hasta 10 emp.) | $8.000 | $500.000 |
| Profesional (con nómina) — **oferta principal** | $200.000 (hasta 10 emp.) | $12.000 | $800.000 |
| Enterprise (todo) | $350.000 | $15.000 | $1.200.000 |

Ejemplos: 20 empleados → Básico $200.000/mes · Profesional $320.000/mes · Enterprise (50 emp.) $1.100.000/mes.

**Add-ons (fase 2):** nómina electrónica XML (+$50.000/mes + $400.000 implementación) · portal autoservicio (+$30.000/mes).

**Descuentos (ejemplo):** pago anual 10%, >100 empleados 15%, combinados hasta 25%.

> Los precios son de ejemplo y deben validarse con el costo real de soporte antes de enviar la propuesta. El sistema de licencias ya soporta plan, seats, vigencia y módulos habilitados.

### 6.1 Fortalezas (mostrar en la demo)

- Horas extras Ley 2101 completas: cálculo automático, límites legales y **alertas en vivo** (diferencial).
- Turnos fijos y rotativos con validación legal de jornada.
- Ficha de empleado moderna e integrada.
- Dashboard analítico profesional (ECharts).
- Base multi-tenant: el mismo software sirve a varios clientes.
- Parámetros legales configurables por año (SMMLV, UVT, recargos, ARL).

### 6.2 Oportunidades (ofrecer como "próximamente")

- Nómina electrónica (XML/CEN) como fase 2.
- Portal de autoservicio para empleados.
- Módulo de préstamos ya implementado como valor agregado.
- Integración con reloj biométrico/QR.

### 6.3 Riesgos (no prometer en la demo)

- XML de nómina electrónica (no existe): presentarla como fase 2 con fechas.
- Biometría / app móvil nativa (no existe).
- Reportes de rotación de personal (requiere histórico de retiros, no existe).
- Desempeño y reclutamiento (módulos no construidos).

### 6.4 Escenarios de demo recomendados

1. Crear empleado → asignar turno rotativo → ver validación de 42 h.
2. Registrar asistencia 8:00 → 18:30 (2,5 h extra) → ver alerta en vivo en la campana.
3. Crear permiso médico → aprobar desde la ficha del empleado.
4. Liquidar nómina del mes → aprobar → ver el desglose.
5. Cerrar con el dashboard: KPIs, evolución, heatmap y gauge.

### 6.5 Material de venta ya construido

La landing pública (`/`) incluye un rediseño profesional con hero, módulos, pasos, roles y una sección **Demo** con capturas reales del sistema:

- `public/screenshots/empleados.png` — ficha y gestión de empleados.
- `public/screenshots/nomina.png` — liquidación de nómina.
- `public/screenshots/ausencias.png` — ausencias y permisos.
- `public/screenshots/dashboard-real.png` — dashboard de analítica (captura real, alargada, recortada).

Las capturas se generaron desde la propia aplicación con datos demo a 2x. Para actualizarlas: iniciar sesión, navegar a la vista, capturar a 2x y reemplazar el PNG correspondiente (la landing las referencia directamente desde `public/screenshots/`).

---

## 7. HOJA DE RUTA

### Opción A: Gestión + Turnos + Extras (sin nómina)

- **Estado actual: ✅ Completo y demostrable.**
- Faltante: pulido opcional (foto, vencimiento de contratos).
- **Tiempo: 0 días** (solo datos demo y prueba de escenarios).

### Opción B: Gestión + Turnos + Extras + Nómina

- Faltante: XML de nómina electrónica (CEN), parametrización del cliente, pruebas.
- **Tiempo estimado: 5–8 días** (3–5 XML + 1–2 parametrización + 1 integración/pruebas).
- Dependencias: parámetros legales del cliente; decisión de envío a DIAN.

### Siguientes módulos (post-venta)

| Módulo | Esfuerzo estimado |
| :--- | :--- |
| Portal de autoservicio | 3–4 días |
| Bajas y liquidación final (incluido en el núcleo) | 3–5 días |
| Contratos (módulo opcional) | ✅ Implementado (núcleo de historial listo) |
| Evaluación de desempeño | ✅ Implementado (campañas con generación masiva, dashboard y PDF) |
| Organización (áreas, cargos, organigrama) | ✅ Implementado |
| Reclutamiento y selección (integrado con contratos) | 5–7 días |
| Nómina electrónica XML | 3–5 días |
| Biometría / QR | 2–4 días |

**Nota sobre contratos y bajas:** el módulo de **bajas y liquidación final** (retiro, motivo, certificado laboral, liquidación proporcional, histórico de ex-empleados y recontratación) forma parte del **núcleo del sistema** y está disponible para cualquier cliente. El módulo de **contratos** (historial, renovaciones, vencimientos) es **opcional** y se empalma con reclutamiento: al marcar un candidato como contratado se crea el empleado y se pre-genera su contrato.

### Vinculación (núcleo) vs. Contratos (opcional)

**Estado actual:** el historial de vinculación (EmploymentPeriod) y el módulo de contratos ya están implementados: la ficha del empleado muestra sus períodos (ingreso/salida/motivo/estado), permite reingresar, crear y renovar contratos, y el KPI de rotación cuenta períodos terminados (correcto para reingresos).

El sistema distingue dos conceptos que suelen confundirse:

| | EmploymentPeriod (vinculación) | Contract (documento legal) |
| :--- | :--- | :--- |
| Representa | El hecho: período en que la persona estuvo vinculada | El documento: condiciones (salario, cargo, tipo, vigencia) |
| Pregunta | ¿Está vinculado? ¿Desde cuándo? ¿Cuándo salió? | ¿Qué condiciones tiene? ¿Cuándo vence? ¿Se renovó? |
| Ciclo | Ingreso → vigente → salida → reingreso (nuevo período) | Creación → vigente → renovación → terminación |
| Historial de reingresos | Sí: varios períodos por empleado | No aplica |
| Módulo | **Núcleo** (todos los clientes) | **Opcional** (add-on) |

**Relación:** un período de vinculación puede tener varios contratos (inicial, renovaciones, modificaciones), y cada contrato referencia su período. Sin el módulo de contratos, el sistema conserva el historial completo de ingresos, salidas y reingresos; con él, además se gestionan los documentos legales y sus vencimientos.

---

## 8. GLOSARIO DE TÉRMINOS CLAVE

- **Tenant / tenantId**: empresa cliente aislada en la misma base de datos.
- **Feature flag**: interruptor que activa/desactiva un módulo por tenant.
- **Ley 2101 de 2021**: reduce la jornada máxima a 42 horas semanales y define la transición del recargo por día de descanso (80% → 90% → 100%).
- **IBC**: ingreso base de cotización (salario + auxilio en la implementación actual).
- **Seats**: número máximo de usuarios/empleados cubiertos por una licencia.
- **SSE**: Server-Sent Events, canal de alertas en tiempo real.

---

*Fin del informe. Fuente: conversación de desarrollo del proyecto + auditoría de código (agosto 2026).*
