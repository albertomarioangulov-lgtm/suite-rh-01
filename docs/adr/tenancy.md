# ADR-001 — Estrategia de tenencia de datos (multi-tenant híbrido)

**Estado:** Aceptado (2026-09-02)
**Ámbito:** Arquitectura de datos y despliegue del HRMS (Suite RH)

## Contexto

Suite RH atiende a varios clientes (empresas/tenants). El modelo de datos ya
es multi-tenant por diseño (toda entidad operativa lleva `tenantId` y los
usuarios pueden pertenecer a varias empresas), pero la aplicación se despliega
hoy como **una instancia ↔ una base de datos ↔ una empresa activa**
(`Company.getConfig()` = `active: true`).

Necesitamos decidir cómo escalar a varios clientes sin comprometer el
aislamiento ni encarecer el plan estándar, y permitir que un cliente
enterprise pueda pedir **su propia base de datos** (por aislamiento, respaldo
propio o requisitos del cliente/normativos).

## Decisión

Adoptar **tenencia híbrida por niveles**, con un único modelo de datos que
separa el *qué* (tenant, módulos habilitados) del *dónde* (storage):

1. **Pool compartido (por defecto)**: varios tenants en una misma base,
   aislados por `tenantId`. Plan estándar.
2. **Base dedicada (enterprise)**: el tenant vive en su propia base dentro
   del cluster (o cluster propio). Aislamiento alto, respaldos y migraciones
   independientes.
3. **Instancia dedicada**: mismo código, despliegue separado por cliente
   (hosted.app) + su base. Es el mecanismo actual y la forma de ejecutar
   tanto el plan estándar como el enterprise **sin cambios de código**.

La fuente de verdad del aprovisionamiento (qué plan, qué módulos, qué
storage) será el **proyecto de licencias/control plane**, no la UI del HRMS.

### Regla de oro

- Toda consulta de negocio pasa por el `tenantId` de la sesión
  (`addTenantFilter` / `getTenantId`).
- Los secretos de conexión y la decisión de storage se resuelven en el
  servidor (env o control plane); nunca se exponen al cliente.
- Cada cambio de fase debe ser reversible y no obligar a migrar datos dos
  veces (por eso las fases se ordenan de menor a mayor acoplamiento).

## Fases y plan de migración

### Fase 1 — Instancia + base por cliente (hoy, sin cambios de código)

```
Repo Suite RH (único código)
 ├─ instancia A (hosted.app) → BD Atlas cliente_x   ← cliente X
 └─ instancia B (hosted.app) → BD Atlas cliente_y   ← cliente Y
```

Solo cambian variables de entorno entre instancias (`MONGODB_URI`,
`MONGODB_NAME`, `NUXT_SESSION_PASSWORD`, `DIAN_CERT_SECRET`, `CORS_ORIGINS`,
`APP_URL`). Ver runbook: `docs/runbook-nuevo-tenant.md`.

**Migración a pool (Fase 2):** consolidar bases en una sola; los datos ya
llevan `tenantId`, así que el trabajo es de código, no de datos.
**Migración a dedicada:** ninguna — la Fase 1 ya es una base por cliente.

### Fase 2 — Pool compartido en una instancia

Requisitos de código (pequeños y localizados):

- La configuración de Empresa y Parámetros legales debe resolverse por el
  `tenantId` de la sesión (hoy `getCompanyConfig()` usa la empresa
  `active: true` global).
- Endpoint de administración del control plane para **crear un tenant**
  (Company + TenantConfig) y asociar usuarios (`tenantIds`).
- Pruebas de aislamiento: el usuario del tenant A no ve datos del B.

### Fase 3 — Base dedicada por tenant (enterprise)

Igual que la Fase 1 por cliente: cada instancia conoce **solo su base** (env).
El control plane guarda el mapa `tenant → deployment URL + databaseRef` y
emite la licencia.

### Fase 4 — Una instancia sirviendo pool + dedicadas (solo si el negocio lo exige)

Requiere un **connection manager** en Nitro: `Map<dbName, mongoose.Connection>`
y modelos vinculados por conexión (`conn.model(...)`). Es un refactor profundo
(hoy los modelos se importan estáticos de la conexión por defecto); no se
hará hasta que un cliente real lo justifique.

## Consecuencias

**Positivas**
- Aislamiento real por cliente desde el día uno (Fase 1) sin refactor.
- Plan estándar barato (pool) y enterprise premium (dedicada) con la misma
  base de código.
- Cumplimiento de protección de datos (Ley 1581): residencia y respaldo por
  cliente cuando se requiere.
- Migración entre fases de bajo riesgo gracias a `tenantId` en todos los datos.

**Negativas / pendientes**
- El pool compartido exige disciplina estricta de `tenantId` en toda query
  nueva (se debe exigir en code review y cubrir con tests de aislamiento).
- Hasta la Fase 2 no hay UI para crear un segundo tenant en la misma base.
- Rate limit y alertas SSE son en memoria por instancia (para pool multi
  instancia se requeriría Redis/KV compartido).

## Estrategia de release (una sola versión para todos)

**Decisión:** el software es **uno solo**: todos los clientes corren la misma
versión del código; lo que diferencia a cada tenant es su configuración
(variables de entorno + datos en su BD: empresa, parámetros legales y
feature flags). No se crean ramas ni builds por cliente.

```
feature/xyz ──PR──▶ main (desarrollo + CI)
                         │  merge controlado
                         ▼
                     release (gate opcional: validación en staging)
                         │
        ┌────────────────┼─────────────────┐
        ▼                ▼                 ▼
 backend cliente A   backend cliente B   backend cliente C
 (BD propia + env)   (BD propia + env)   (BD propia + env)
```

- Los **backends de clientes** observan `main` (o la rama `release` si se
  quiere un freno de publicación). Nunca una rama por cliente.
- Las **feature flags** (`TenantConfig.enabledFlags`) activan módulos por
  tenant y sirven también para rollout gradual de funciones nuevas.
- Antes de publicar en main: cambios **aditivos y retrocompatibles** en BD
  (correr primero los scripts de migración), validar typecheck y tests.
- **CI (pendiente, por definir con calma):** un workflow de GitHub Actions que
  ejecute `npm run typecheck && npm test` en cada PR es el guardián de main;
  se documentará en `docs/adr/ci.md` cuando se adopte.

## Alternativas consideradas

1. **Solo pool compartido:** más barato, pero sin respuesta enterprise.
2. **Solo base dedicada:** aísla todo, pero encarece el plan estándar y
   multiplica la operación.
3. **Selector de base en la UI del HRMS:** descartado — la decisión de
   storage no debe depender del usuario final ni vivir en la pantalla de
   empresa; pertenece al control plane (licencias) y al server.

## Referencias

- `docs/arquitectura-tecnica.md` (§ Multi-tenant, § Despliegue).
- `server/utils/tenant.ts` (`getTenantId`, `addTenantFilter`, `syncUserTenants`).
- `server/models/Company.ts` (`Company.getConfig()` = empresa activa).
- Runbook operativo: `docs/runbook-nuevo-tenant.md`.
