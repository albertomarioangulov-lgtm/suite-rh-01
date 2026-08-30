# Referencia Vuetify 4 (nomina-app-01)

> Versión instalada: **vuetify 4.1.11** (verificar siempre en `package.json`).
> Fuente local: `node_modules/vuetify` (`.d.ts` y `.js` compilados).
> Docs oficiales: https://vuetifyjs.com + guía de upgrade (https://vuetifyjs.com/en/getting-started/upgrade-guide).
> MCP oficial de Vuetify: `@vuetify/mcp` (hosted en `https://mcp.vuetifyjs.com/mcp`).

## Configuración del proyecto

- **Sin `@vuetify/nuxt`**: Vuetify se registra manualmente en `app/plugins/vuetify.ts` con `vite-plugin-vuetify` y `blueprint: 'md3'`.
- Defaults globales en el plugin: `variant: 'filled'`, `density: 'compact'`, `hideDetails: 'auto'`.
- Temas: 4 (light/dark + 2 personalizados), definidos en `app/plugins/vuetify.ts`.
- Componentes auto-importados por Nuxt; el prefijo lo da la carpeta:
  - `app/components/common/DataCards.vue` → `<CommonDataCards>`
  - `app/components/users/Cards.vue` → `<UsersCards>`
  - `app/components/users/Table.vue` → `<UsersTable>`

## Cambios clave V3 → V4 (verificados en 4.1.11)

| Tema                                | En Vuetify 4                                                                           |
| ----------------------------------- | -------------------------------------------------------------------------------------- |
| Grid                                | Vive en `VGrid`: `VContainer`, `VRow`, `VCol`, `VSpacer`.                              |
| `dense` (VRow)                      | Deprecado → `density="compact"`.                                                       |
| `align` / `justify` (VRow)          | Siguen existiendo pero deprecados → clases `align-*` / `justify-*`.                    |
| `order` / `align-self` (VCol)       | Deprecados → clases `order-*` / `align-self-*`.                                        |
| Slots de columnas en VDataTable     | `item` es el registro crudo; `internalItem` es el wrapper (`raw`, `columns`, `index`). |
| VSelect / VCombobox / VAutocomplete | En slots, `item` es alias de `internalItem.raw`.                                       |
| Elevación                           | MD3: solo `elevation-0` … `elevation-5`.                                               |
| VBtn                                | Ya no es `uppercase` por defecto.                                                      |
| Tema por defecto                    | Cambió a `system` (seguir la preferencia del SO).                                      |
| VForm                               | Slots con valores ya desenvueltos (sin `.value`).                                      |
| VContainer `fill-height`            | Ya no centra verticalmente solo; añadir `d-flex align-center` si se necesita.          |

## Patrones ya usados en este proyecto

### VDataTable (slots)

```vue
<template #item.rol="{ item }">
  {{ item.rol }}
  <!-- item ya es el objeto crudo; NO usar item.raw.rol -->
</template>
```

Si necesitas índice o columnas, usa `internalItem`:

```vue
<template #item.rol="{ internalItem }">
  {{ internalItem.index }} - {{ internalItem.raw.rol }}
</template>
```

### Grid (VRow / VCol)

```vue
<VRow density="compact" class="align-center justify-space-between">
  <VCol cols="12" sm="6">
    ...
  </VCol>
</VRow>
```

### Formularios con reglas zod

- Reglas Vuetify en `app/utils/validation-rules.ts` (adaptadas desde `shared/utils/validation-schemas.ts`).
- `VForm` + `ref` + `validate()`; los valores del slot `#default` ya no llevan `.value`.

## Consejos de depuración

- Warnings `[Vuetify UPGRADE] ... deprecated` → reemplazar por lo indicado en el mensaje.
- `<Suspense> is an experimental feature` es interno de Vue/Nuxt; inofensivo.
- Si un componente no se resuelve, revisar el nombre registrado en `.nuxt/components.d.ts` (prefijo por carpeta).
