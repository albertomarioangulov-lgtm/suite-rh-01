# ADR-002 — Sedes (ubicaciones) bajo un mismo NIT

**Estado:** Aceptado (2026-09-03)
**Ámbito:** Organización y ubicaciones del HRMS (Suite RH)

## Contexto

Un cliente opera en varias ciudades/oficinas que comparten el **mismo NIT**.
Los empleados pueden trabajar en distintas sedes y el organigrama debe
reflejarlas. Cada sede puede tener sus propias áreas; el DSNE (nómina
electrónica DIAN) exige el `LugarTrabajo` de cada trabajador, hoy tomado de
la dirección de la empresa para todos.

Se descarta (confirmado con el cliente) el caso de NITs distintos dentro de
la misma oficina para esta iteración: eso sería otro tenant/empleador y se
trataría en un ADR futuro de “grupo económico”.

## Decisión

1. **`Sede` es una entidad de primer nivel** bajo la empresa (tenant):
   `Company → Sede → Department (área) → Position (cargo) → Employee`.
2. Campos mínimos de `Sede`: nombre, código, ciudad, municipio (DIVIPOLA 5
   dígitos), dirección, teléfono, `isMain`, `active`, orden.
3. **Una sola sede principal por empresa** (`isMain: true`), validado al
   guardar. Es el respaldo por defecto (empleados/áreas sin sede) y la
   ubicación fiscal principal.
4. **Las áreas pertenecen a una sede** (`department.sedeId`): una misma área
   en dos ciudades son registros distintos (simple y operativamente correcto).
5. **El empleado pertenece a una sede** (`employee.sedeId`) además de su área
   y cargo. El jefe directo puede estar en otra sede (gerencia central); el
   organigrama lo dibuja como borde cruzado sin restricción.
6. El organigrama se muestra en niveles: **Empresa → Sedes → Áreas → Jefes →
   Empleados**, con la sede principal resaltada y KPIs/filtros por sede.
7. Para el **DSNE**, `LugarTrabajo` del trabajador sale de su sede
   (dirección + municipio DIVIPOLA); la empresa conserva sus datos fiscales.

## Regla de oro

- **Sede = ubicación del mismo empleador (NIT)**. Si una “sede” tiene NIT
  propio, es otro tenant, no una sede interna (ver ADR-001).

## Fases (migración fácil, aditivas)

### Fase A — Modelo + CRUD + migración

- Nuevo modelo `Site` + endpoints CRUD + pestaña “Sedes” en Organización.
- Migración automática/backfill: crear la “Sede Principal” desde los datos de
  la empresa y asignarla como `isMain`; los `Department`/`Employee` existentes
  quedan con `sedeId` opcional (nullable) sin romper nada.
- Regla: no se puede eliminar la sede principal mientras existan otras sedes
  (se desactiva); siempre hay al menos una sede activa.

### Fase B — Organigrama y fichas

- Organigrama árbol/sunburst con sedes (primer nivel).
- Selector de sede en fichas de empleado y de área; filtros y conteos por sede.

### Fase C — DSNE y analítica

- `LugarTrabajo` por sede en el CEN (`buildCenForEmployee`).
- Reportes/indicadores por sede (headcount, ausencias, horas, nómina).

## Alternativas consideradas

- **Campo suelto “ciudad” en el empleado**: insuficiente (áreas y reportes
  necesitan la sede como entidad).
- **Catálogo de áreas compartido + asignación por sede**: más complejo sin
  beneficio real a esta escala; se descarta.
- **Sede con NIT propio dentro de la misma empresa**: inválido para el DSNE;
  se descarta (otro tenant).

## Referencias

- ADR-001 (tenencia híbrida) — `docs/adr/tenancy.md`.
- Anexo técnico DSNE: elemento `Trabajador/LugarTrabajo*`.
- Módulo de organización: `app/pages/admin/organization.vue`,
  `server/models/Department.ts`, `server/models/Employee.ts`.
