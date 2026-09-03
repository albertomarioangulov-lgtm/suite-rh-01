# Runbook — Aprovisionar un nuevo cliente/tenant (Fase 1)

> Objetivo: poner en marcha un ambiente aislado para un cliente usando el
> **mismo repositorio** pero con su propia base de datos y su propio backend
> en **Firebase App Hosting** (una instancia ↔ una BD ↔ un cliente).
> Decisión de arquitectura: `docs/adr/tenancy.md`.

## 0. Qué se crea

```
Repositorio suite-rh-01 (único código)
 ├─ backend actual (App Hosting) → BD Atlas: nomina_app-01-dev   ← tu entorno/dev
 └─ backend nuevo (App Hosting)  → BD Atlas: nomina_app_CLIENTE  ← cliente piloto
```

El código es el mismo; cambian las **variables de entorno** y la **base de
datos** de cada backend.

---

## 1. Base de datos en MongoDB Atlas (por cliente)

1. En Atlas → Project → **Database Access**: crea un usuario con permisos
   acotados solo a la base del cliente, p. ej. `cliente_x_user` con
   `readWrite` sobre `nomina_app_cliente_x`.
2. En **Network Access**: permite el rango/`0.0.0.0/0` solo si confías en el
   firewall de App Hosting (recomendado para pilotos); para producción,
   restringe por IP o usa Private Service Connect si lo tienes disponible.
3. Anota la connection string:
   `mongodb+srv://cliente_x_user:<password>@cluster0.xxxxx.mongodb.net`
   (sin nombre de base: la app la agrega con `MONGODB_NAME`).

> Recomendación: cada cliente en su propia base **dentro del mismo cluster**
> es suficiente para el piloto; el cluster dedicado se reserva para planes
> enterprise grandes.

## 2. Backend nuevo en Firebase App Hosting

En Firebase Console → **App Hosting → Crear backend** (o “Add backend”):

1. **Git**: conecta el mismo repositorio de GitHub (`suite-rh-01`).
2. **Rama**: todos los backends apuntan a la misma rama (**`main`** por
   defecto, o una única rama **`release`** si quieres un freno de publicación:
   valida en staging y luego haces merge `main` → `release` cuando decides
   publicar). **No** usar una rama por cliente: el software es una sola
   versión para todos y cada cliente se personaliza con su configuración
   (env + BD + módulos activados). Ver `docs/adr/tenancy.md`.
3. **Root directory**: `/` (el repo es la raíz de la app Nuxt).
4. **Build**: auto-detect de Nuxt; comando `npm run build` (ya configurado en
   `package.json`). Región: la misma que tu entorno actual para latencia
   homogénea.
5. **Variables de entorno** del backend (marca como *secret* las sensibles):

| Variable | Valor ejemplo (cliente X) | Secret |
|---|---|---|
| `MONGODB_URI` | `mongodb+srv://cliente_x_user:...@cluster0.xxxxx.mongodb.net` | sí |
| `MONGODB_NAME` | `nomina_app_cliente_x` | no |
| `NUXT_SESSION_PASSWORD` | frase larga aleatoria (≥32 chars) distinta a la de otros entornos | sí |
| `DIAN_CERT_SECRET` | clave aleatoria larga (firma del DSNE) | sí |
| `CORS_ORIGINS` | URL del nuevo backend (o vacío si solo same-origin) | no |
| `APP_URL` | `https://cliente-x--tuproyecto.us-east4.hosted.app` (o dominio propio) | no |
| `NODE_ENV` | `production` | no |
| `BREVO_API_KEY` / `BREVO_SENDER_EMAIL` / `BREVO_WEBHOOK_SECRET` | del cliente o genérica del proveedor | API key y webhook sí |

6. **Deploy**: primer rollout del backend (App Hosting despliega al push a la
   rama conectada o con deploy manual). Verifica que cargue la URL
   `<backend>--<proyecto>.<region>.hosted.app`.

> Nota: cada backend es un servicio facturable por separado en Firebase.

## 3. Sembrar la base nueva (una vez desplegada la app)

Desde tu máquina, apuntando el `.env` a la base del cliente (o exportando las
mismas variables):

```bash
# 1. Parámetros legales vigentes (los módulos los requieren para cálculos)
node scripts/seed-legal-params-2026.mjs

# 2. Cuentas iniciales (no hay registro público):
#    - superadmin de AMAV (activa módulos/licencia; el admin del cliente no puede)
#    - admin del cliente (gestiona usuarios y configuración de su empresa)
node scripts/create-admin.mjs amav@tuempresa.com "Suite RH (AMAV)" "ClaveAmav123!" superadmin
node scripts/create-admin.mjs admin@cliente.com "Admin Cliente" "ClaveTemporal123!"

# 3. Opcional: plantillas de evaluación demo por cargo
node scripts/seed-evaluation-templates.mjs

# 4. Opcional: demo completa (turnos, empleados, asistencias, nóminas)
DEMO_PASSWORD=Demo123! node scripts/seed-demo-payroll-month.mjs
```

> Cuidado: los scripts usan `MONGODB_URI`/`MONGODB_NAME` del `.env` local.
> Asegúrate de apuntar a la BD del cliente antes de ejecutarlos.

## 4. Configuración dentro de la app (con el admin nuevo)

1. **Empresa**: Configuración → Empresa → datos del cliente (nombre, NIT,
   municipio DIVIPOLA, etc.). Este primer guardado crea el `Company`
   (`active: true`) que actúa como tenant.
2. **Módulos**: Configuración → Módulos → activar:
   - **Empleados** (`employees`)
   - **Evaluación de desempeño** (`performance`)
3. **Usuarios del cliente**: Usuarios → crear (rol `admin` o `hr`) o invitar
   por email.
4. **Organización** (requisito para evaluaciones por cargo): Organización →
   crear **áreas** y **cargos**.
5. **Empleados**: cargar las fichas (documento, cargo, salario base, tipo de
   contrato).
6. **Evaluaciones**: Configuración → Evaluaciones → activar el módulo →
   crear **plantillas** por cargo → crear **campaña** (alcance todas/áreas) →
   **Generar evaluaciones** → los evaluadores responden → aprobar.

## 5. Verificación (checklist)

- [ ] La URL del backend nuevo carga sin errores y sin datos del entorno dev.
- [ ] `MONGODB_NAME` apunta a la BD del cliente (revisa que no aparezcan los
      datos demo de tu dev).
- [ ] Sesión y login funcionan con el admin creado.
- [ ] Empleados y Evaluaciones aparecen en el menú (módulos activados).
- [ ] Crear un área, un cargo, un empleado y una campaña demo sin errores.

## 6. Migraciones futuras (fáciles)

- **Pool compartido (Fase 2)**: consolidar varias BDs en una (los datos ya
  llevan `tenantId`) + ajustar la configuración de Empresa por tenant de
  sesión. Es cambio de código pequeño, no de datos.
- **Cluster/instancia dedicada**: sin cambio — esta Fase 1 ya es una base por
  cliente; solo cambia dónde vive la BD.
- **Actualizar el código de todos los clientes**: push a `main` (o merge
  controlado a `release`) → App Hosting redeploya los backends que observan
  esa rama. Todos reciben la misma versión; las diferencias entre clientes
  siguen siendo su configuración (env + BD + módulos activados).
