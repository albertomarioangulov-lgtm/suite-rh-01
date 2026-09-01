# Referencia de API — Suite RH

> Inventario generado desde `server/api/v1/` (140 endpoints). Base: `/api/v1`; autenticación por cookie de sesión; errores en formato `{ statusCode, message, data? }`.
>
> Contexto de la plataforma en [docs/arquitectura-tecnica.md](arquitectura-tecnica.md).

## Índice por módulo

- [Autenticación](#auth)
- [Usuarios](#users)
- [Empresa y certificado DIAN](#company)
- [Parámetros legales](#legal-params)
- [Empleados](#employees)
- [Vinculación e historial](#employment-periods)
- [Organización — Áreas](#departments)
- [Organización — Cargos](#positions)
- [Contratos](#contracts)
- [Turnos](#shifts)
- [Asistencia](#attendance)
- [Ausencias e incapacidades](#absences)
- [Préstamos](#loans)
- [Nómina](#payroll)
- [Nómina — Ciclos de pago](#payroll-cycles)
- [Nómina — Conceptos](#payroll-concepts)
- [Desempeño — Plantillas](#evaluation-templates)
- [Desempeño — Configuración](#evaluation-config)
- [Desempeño — Campañas](#evaluation-campaigns)
- [Desempeño — Evaluaciones](#evaluations)
- [Analítica y alertas](#analytics)
- [Tiempo real (SSE)](#events)
- [Feature flags](#flags)
- [Correo transaccional](#emails)
- [Portal del empleado](#self)
- [Público](#public)
- [Contacto](#contact-messages)

## Convenciones

| Columna | Significado |
|---|---|
| Acceso | Roles permitidos (según `authorize`); sin rol listado = cualquier sesión autenticada. |
| Flag | Feature flag del módulo requerido por `requireFlag` (403 si está desactivado para el tenant). |

---

## Ausencias e incapacidades `/absences`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| **GET** | `/api/v1/absences` | autenticado · flag `absences` | Lista de ausencias (filtros, paginación). |
| **POST** | `/api/v1/absences` | autenticado · flag `absences` | Crea ausencia con cálculo de días y valores. |
| **DELETE** | `/api/v1/absences/:id` | admin | Elimina ausencia. |
| **GET** | `/api/v1/absences/:id` | admin/ manager/ hr | Detalle de ausencia. |
| **PUT** | `/api/v1/absences/:id` | admin/ manager/ hr | Actualiza ausencia. |
| **PUT** | `/api/v1/absences/:id/approve` | admin/ manager/ hr | Aprueba una ausencia. |
| **PUT** | `/api/v1/absences/:id/reject` | admin/ manager/ hr | Rechaza una ausencia (con motivo). |
| **GET** | `/api/v1/absences/report` | admin/ manager/ hr | Reporte agregado de ausencias. |
## Analítica y alertas `/analytics`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| **GET** | `/api/v1/analytics/alert-config` | autenticado | Configuración de alertas del tenant. |
| **PUT** | `/api/v1/analytics/alert-config` | admin | Actualiza alertas y destinatarios por rol. |
| **GET** | `/api/v1/analytics/alerts` | autenticado | Lista de alertas. |
| **PUT** | `/api/v1/analytics/alerts/:id/read` | admin/ manager/ hr | Marca una alerta como leída. |
| **GET** | `/api/v1/analytics/overview` | admin/ manager/ hr | Indicadores del dashboard (rotación, nómina, ausencias, asistencia). |
## Asistencia `/attendance`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| **GET** | `/api/v1/attendance` | autenticado · flag `attendance` | Lista de asistencias (filtros por fecha/empleado/estado). |
| **POST** | `/api/v1/attendance` | autenticado · flag `attendance` | Registra asistencia con cálculo de horas, extras, recargo y tardanza. |
| **DELETE** | `/api/v1/attendance/:id` | admin | Elimina un registro. |
| **GET** | `/api/v1/attendance/:id` | autenticado | Detalle de un registro. |
| **PUT** | `/api/v1/attendance/:id` | admin/ manager/ hr | Actualiza un registro (recalcula campos). |
| **PUT** | `/api/v1/attendance/:id/approve` | admin/ manager/ hr | Aprueba un registro pendiente. |
| **PUT** | `/api/v1/attendance/:id/reject` | admin/ manager/ hr | Rechaza un registro. |
| **PUT** | `/api/v1/attendance/:id/status` | admin/ manager/ hr | Cambia el estado de un registro. |
| **GET** | `/api/v1/attendance/config` | autenticado · flag `attendance` | Configuración de asistencia (tolerancia, jornada). |
| **PUT** | `/api/v1/attendance/config` | autenticado · flag `attendance` | Actualiza tolerancia/jornada (recalcula solo períodos no liquidados). |
| **GET** | `/api/v1/attendance/dashboard` | autenticado · flag `attendance` | Dashboard de asistencia (series, heatmap, promedios). |
| **GET** | `/api/v1/attendance/monthly/:employeeId` | autenticado | Resumen mensual de un empleado. |
| **GET** | `/api/v1/attendance/weekly/:employeeId` | autenticado | Resumen semanal de un empleado. |
## Autenticación `/auth`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| **POST** | `/api/v1/auth/invite` | autenticado | Crea un usuario e invita por email (token con hash, expira 72 h). |
| **POST** | `/api/v1/auth/login` | autenticado | Inicia sesión con email/contraseña y crea la sesión sellada. |
| **POST** | `/api/v1/auth/logout` | autenticado | Cierra la sesión del usuario. |
| **GET** | `/api/v1/auth/me` | autenticado | Devuelve el usuario autenticado hidratado desde la BD. |
| **PUT** | `/api/v1/auth/password` | autenticado | Cambia la contraseña del usuario autenticado. |
| **PUT** | `/api/v1/auth/tenant` | autenticado | Cambia el tenant activo de la sesión. |
| **GET** | `/api/v1/auth/tenants` | autenticado | Lista las empresas (tenants) del usuario y su tenant activo. |
## Empresa y certificado DIAN `/company`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| **GET** | `/api/v1/company` | autenticado | Configuración de la empresa (sin secretos). |
| **PUT** | `/api/v1/company` | admin | Actualiza/crea la configuración (DIAN, jornada, certificado .p12 cifrado). |
| **GET** | `/api/v1/company/audit` | admin/ manager | Historial de auditoría de la configuración. |
| **GET** | `/api/v1/company/cen-test-cert` | admin | Descarga un .p12 de prueba para habilitación (solo desarrollo). |
## Contacto `/contact-messages`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| **GET** | `/api/v1/contact-messages` | admin | Mensajes de contacto recibidos (admin). |
## Contratos `/contracts`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| **GET** | `/api/v1/contracts` | admin/ manager/ hr | Lista de contratos. |
| **POST** | `/api/v1/contracts` | admin/ manager/ hr | Crea contrato vinculado a un período de vinculación. |
| **GET** | `/api/v1/contracts/:employeeId/list` | admin/ manager/ hr | Contratos de un empleado. |
| **PUT** | `/api/v1/contracts/:id/renew` | admin/ manager/ hr | Renueva un contrato con trazabilidad. |
## Organización — Áreas `/departments`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| **GET** | `/api/v1/departments` | admin/ manager/ hr | Lista de áreas de la organización. |
| **POST** | `/api/v1/departments` | admin | Crea área (con color para el organigrama). |
| **DELETE** | `/api/v1/departments/:id` | admin | Elimina área. |
| **PUT** | `/api/v1/departments/:id` | admin | Actualiza área. |
## Correo transaccional `/emails`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| **GET** | `/api/v1/emails` | admin | Historial de correos transaccionales. |
| **POST** | `/api/v1/emails/webhook` | autenticado | Webhook de Brevo (actualiza estado de entrega). |
## Empleados `/employees`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| **GET** | `/api/v1/employees` | autenticado · flag `employees` | Lista empleados (búsqueda, filtros, paginación, vista tabla/tarjetas). |
| **POST** | `/api/v1/employees` | admin/ manager/ hr | Crea empleado + período de vinculación + sincroniza tenants del usuario. |
| **DELETE** | `/api/v1/employees/:id` | admin | Da de baja al empleado (cierra el período de vinculación). |
| **GET** | `/api/v1/employees/:id` | autenticado | Ficha completa del empleado (con turno, área, jefe, historial). |
| **PUT** | `/api/v1/employees/:id` | admin/ manager/ hr | Actualiza la ficha del empleado. |
| **POST** | `/api/v1/employees/:id/rehire` | admin | Reingresa al empleado creando un nuevo período activo. |
| **PUT** | `/api/v1/employees/:id/turno` | admin/ manager/ hr | Asigna turno al empleado. |
| **GET** | `/api/v1/employees/users-available` | admin/ manager/ hr | Usuarios sin ficha de empleado para vincular. |
## Vinculación e historial `/employment-periods`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| **GET** | `/api/v1/employment-periods/:employeeId` | admin/ manager/ hr | Historial de vinculación del empleado (ingresos/salidas/reingresos). |
## Desempeño — Campañas `/evaluation-campaigns`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| **GET** | `/api/v1/evaluation-campaigns` | admin/ manager/ hr | Lista de campañas. |
| **POST** | `/api/v1/evaluation-campaigns` | admin/ hr | Crea campaña (alcance, regla de evaluador, fechas). |
| **DELETE** | `/api/v1/evaluation-campaigns/:id` | admin/ hr | Elimina campaña. |
| **GET** | `/api/v1/evaluation-campaigns/:id` | admin/ manager/ hr | Detalle de campaña con estadísticas. |
| **PUT** | `/api/v1/evaluation-campaigns/:id` | admin/ hr | Actualiza campaña. |
| **POST** | `/api/v1/evaluation-campaigns/:id/generate` | admin/ hr | Genera evaluaciones en lote (idempotente) y notifica. |
| **GET** | `/api/v1/evaluation-campaigns/:id/history` | admin/ hr | Historial de generación de la campaña. |
## Desempeño — Configuración `/evaluation-config`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| **GET** | `/api/v1/evaluation-config` | admin/ manager/ hr | Configuración del módulo de desempeño. |
| **PUT** | `/api/v1/evaluation-config` | admin/ hr | Actualiza configuración (registra historial). |
| **GET** | `/api/v1/evaluation-config/history` | admin/ hr | Historial de cambios de configuración. |
## Desempeño — Plantillas `/evaluation-templates`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| **GET** | `/api/v1/evaluation-templates` | admin/ manager/ hr | Plantillas de evaluación. |
| **POST** | `/api/v1/evaluation-templates` | admin | Crea plantilla por cargo. |
| **DELETE** | `/api/v1/evaluation-templates/:id` | admin | Elimina plantilla. |
| **PUT** | `/api/v1/evaluation-templates/:id` | admin | Actualiza plantilla. |
| **GET** | `/api/v1/evaluation-templates/by-position/:positionId` | admin/ manager/ hr | Plantilla activa del cargo. |
## Desempeño — Evaluaciones `/evaluations`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| **GET** | `/api/v1/evaluations` | admin/ manager/ hr | Lista de evaluaciones. |
| **POST** | `/api/v1/evaluations` | admin/ manager/ hr | Crea una evaluación (manual o campaña). |
| **GET** | `/api/v1/evaluations/:id` | admin/ manager/ hr | Detalle de evaluación con respuestas. |
| **PUT** | `/api/v1/evaluations/:id` | admin/ manager/ hr | Guarda respuestas (solo si no está aprobada). |
| **PUT** | `/api/v1/evaluations/:id/approve` | admin/ manager | Aprueba la evaluación (bloquea edición). |
## Feature flags `/flags`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| **GET** | `/api/v1/flags` | admin/ manager/ hr/ employee | Feature flags habilitados del tenant (licencia). |
| **PUT** | `/api/v1/flags` | admin | Habilita/deshabilita módulos del tenant (admin). |
## Parámetros legales `/legal-params`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| **GET** | `/api/v1/legal-params` | autenticado | Parámetros legales vigentes (SMMLV, UVT, auxilio de transporte…). |
| **POST** | `/api/v1/legal-params` | admin | Crea un nuevo período de parámetros legales. |
| **PUT** | `/api/v1/legal-params/:id/activate` | admin | — |
| **GET** | `/api/v1/legal-params/historical` | admin/ manager | Historial de períodos legales. |
## Préstamos `/loans`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| **GET** | `/api/v1/loans` | autenticado · flag `loans` | Lista de préstamos. |
| **POST** | `/api/v1/loans` | admin/ manager/ hr | Crea préstamo (tasa, plazo, cuota, saldo). |
| **GET** | `/api/v1/loans/:id` | admin/ manager/ hr | Detalle de préstamo con pagos. |
| **PUT** | `/api/v1/loans/:id` | admin/ manager/ hr | Actualiza préstamo. |
| **POST** | `/api/v1/loans/:id/payment` | admin/ manager/ hr | Registra un pago/abono y actualiza saldo. |
## Nómina `/payroll`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| **GET** | `/api/v1/payroll` | autenticado · flag `payroll` | Lista de nóminas (filtros por estado/período). |
| **POST** | `/api/v1/payroll` | autenticado · flag `payroll` | Crea nómina por ciclo con devengados/deducciones/seguridad social calculados. |
## Nómina — Conceptos `/payroll-concepts`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| **GET** | `/api/v1/payroll-concepts` | admin/ manager/ hr | Catálogo de conceptos configurables. |
| **POST** | `/api/v1/payroll-concepts` | admin/ manager/ hr | Crea concepto (fijo/porcentaje, bloque DIAN). |
| **DELETE** | `/api/v1/payroll-concepts/:id` | admin/ manager/ hr | Elimina concepto. |
| **PUT** | `/api/v1/payroll-concepts/:id` | admin/ manager/ hr | Actualiza concepto. |
## Nómina — Ciclos de pago `/payroll-cycles`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| **GET** | `/api/v1/payroll-cycles` | admin/ manager/ hr | Lista de ciclos de pago. |
| **POST** | `/api/v1/payroll-cycles` | admin/ manager/ hr | Crea ciclo con frecuencia, fechas y orden. |
| **DELETE** | `/api/v1/payroll-cycles/:id` | admin/ manager/ hr | Elimina ciclo. |
| **PUT** | `/api/v1/payroll-cycles/:id` | admin/ manager/ hr | Actualiza ciclo. |
| **POST** | `/api/v1/payroll-cycles/:id/assign` | admin/ manager/ hr | Asigna empleados al ciclo. |
| **GET** | `/api/v1/payroll-cycles/:id/candidates` | admin/ manager/ hr | Empleados sin ciclo asignado (candidatos). |
| **GET** | `/api/v1/payroll-cycles/:id/employees` | admin/ manager/ hr | Empleados del ciclo. |
| **POST** | `/api/v1/payroll-cycles/:id/move` | admin/ manager/ hr | Mueve un empleado a otro ciclo (con auditoría). |
## Nómina `/payroll`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| **GET** | `/api/v1/payroll/:id` | admin/ manager/ hr | Detalle de nómina (empleados con desglose). |
| **PUT** | `/api/v1/payroll/:id` | admin/ manager/ hr | Actualiza nómina (ajustes). |
| **PUT** | `/api/v1/payroll/:id/approve` | admin/ manager | Aprueba la nómina (borrador → aprobada). |
| **PUT** | `/api/v1/payroll/:id/cancel` | admin | Cancela la nómina. |
| **GET** | `/api/v1/payroll/:id/cen` | admin/ manager/ hr · flag `payroll` | Descarga el DSNE XML de un empleado (firmado si hay certificado). |
| **GET** | `/api/v1/payroll/:id/cen-all` | admin/ manager/ hr · flag `payroll` | Descarga todos los DSNE de la nómina en ZIP. |
| **GET** | `/api/v1/payroll/:id/employees` | admin/ manager/ hr | Empleados de la nómina con desglose. |
| **GET** | `/api/v1/payroll/:id/history` | admin/ manager/ hr | Historial de la nómina (estados y auditoría). |
| **GET** | `/api/v1/payroll/:id/nomina-export` | admin/ manager/ hr · flag `payroll` | Planilla Excel de nómina electrónica para la web DIAN. |
| **POST** | `/api/v1/payroll/:id/transmit` | admin/ manager/ hr · flag `payroll` | Transmite el DSNE firmado al VPFE (SendNominaSync). `?dryRun=true` construye el sobre SOAP sin enviar. |
| **PUT** | `/api/v1/payroll/:id/pay` | admin | Marca la nómina como pagada. |
| **POST** | `/api/v1/payroll/:id/recalculate` | admin/ manager/ hr | Recalcula la nómina con los datos actuales. |
| **GET** | `/api/v1/payroll/dashboard` | admin/ manager/ hr · flag `payroll` | Dashboard de nómina (serie mensual, borradores). |
| **GET** | `/api/v1/payroll/employee/:employeeId` | admin/ manager/ hr · flag `payroll` | Historial de nómina de un empleado. |
## Organización — Cargos `/positions`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| **GET** | `/api/v1/positions` | admin/ manager/ hr | Lista de cargos. |
| **POST** | `/api/v1/positions` | admin | Crea cargo (con funciones). |
| **DELETE** | `/api/v1/positions/:id` | admin | Elimina cargo. |
| **PUT** | `/api/v1/positions/:id` | admin | Actualiza cargo. |
## Público `/public`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| **POST** | `/api/v1/public/contact` | autenticado | Formulario de contacto (rate limit + honeypot). |
## Portal del empleado `/self`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| **GET** | `/api/v1/self/absences` | autenticado | Ausencias propias del empleado. |
| **POST** | `/api/v1/self/absences` | autenticado · flag `absences` | Solicita una ausencia desde el portal. |
| **DELETE** | `/api/v1/self/absences/:id` | autenticado | Cancela una solicitud propia. |
| **GET** | `/api/v1/self/me` | autenticado | Perfil del empleado autenticado (portal). |
| **GET** | `/api/v1/self/payroll` | autenticado | Recibos/nóminas propios del empleado. |
## Turnos `/shifts`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| **GET** | `/api/v1/shifts` | autenticado · flag `shifts` | Lista de turnos. |
| **POST** | `/api/v1/shifts` | admin/ manager/ hr | Crea turno con jornadas y rangos. |
| **DELETE** | `/api/v1/shifts/:id` | admin | Elimina turno. |
| **GET** | `/api/v1/shifts/:id` | admin/ manager/ hr | Detalle de turno. |
| **PUT** | `/api/v1/shifts/:id` | admin/ manager/ hr | Actualiza turno. |
| **POST** | `/api/v1/shifts/:id/assign` | admin/ manager/ hr | Asigna empleados al turno. |
| **GET** | `/api/v1/shifts/:id/employees` | admin/ manager/ hr | Empleados asignados al turno. |
| **GET** | `/api/v1/shifts/:id/history` | admin/ manager/ hr | Historial de asignaciones del turno. |
| **POST** | `/api/v1/shifts/:id/unassign` | admin/ manager/ hr | Desasigna empleados del turno. |
## Usuarios `/users`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| **GET** | `/api/v1/users` | admin/ manager | Lista usuarios (búsqueda, filtros, paginación). |
| **POST** | `/api/v1/users` | admin | Crea un usuario. |
| **DELETE** | `/api/v1/users/:id` | admin | Desactiva/elimina un usuario. |
| **GET** | `/api/v1/users/:id` | autenticado | Detalle de un usuario. |
| **PUT** | `/api/v1/users/:id` | autenticado | Actualiza rol/estado/datos de un usuario. |
| **POST** | `/api/v1/users/:id/invite` | admin | Reenvía la invitación por email. |

---

*Referencia mantenible: regenerar el inventario con un recorrido de `server/api/v1`.*
