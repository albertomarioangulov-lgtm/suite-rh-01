<script setup lang="ts">
import type { ViewMode } from '~/composables/useViewMode'

/**
 * Toolbar reutilizable para páginas de listado.
 *
 * Incluye un buscador opcional (v-model:search) y dos slots:
 * - `#filters`: controles específicos de la página (empleado, estado, fechas…).
 * - `#actions`: botones de acción (crear, exportar, toggle de vista…).
 * También admite el toggle lista/tarjetas (`v-model:view-mode`) opcional.
 * El density de los controles viene de los defaults globales de Vuetify.
 */
const props = withDefaults(
  defineProps<{
    search?: string
    searchPlaceholder?: string
    /** Ocultar el buscador (cuando la página no lo necesita). */
    hideSearch?: boolean
    /** Muestra la barra de progreso superior (cargando). */
    loading?: boolean
    /** Modo de vista actual; si se define, muestra el toggle lista/tarjetas. */
    viewMode?: ViewMode | null
  }>(),
  {
    search: '',
    searchPlaceholder: 'Buscar…',
    hideSearch: false,
    loading: false,
    viewMode: null,
  },
)

const emit = defineEmits<{
  (e: 'update:search', value: string): void
  (e: 'update:viewMode', value: ViewMode): void
}>()

const toggleView = () => {
  const next: ViewMode = props.viewMode === 'table' ? 'cards' : 'table'
  emit('update:viewMode', next)
}
</script>

<template>
  <v-toolbar color="surface" class="mb-1 position-relative">
    <v-progress-linear
      v-if="loading"
      indeterminate
      color="primary"
      height="3"
      class="position-absolute top-0 left-0 right-0"
      style="border-radius: 12px 12px 0 0"
    />
    <v-defaults-provider
      :defaults="{
        VTextField: { variant: 'solo', flat: true, bgColor: 'surface-light' },
        VSelect: { variant: 'solo', flat: true, bgColor: 'surface-light' },
        VAutocomplete: { variant: 'solo', flat: true, bgColor: 'surface-light' },
        VTextarea: { variant: 'solo', flat: true, bgColor: 'surface-light' },
        VCombobox: { variant: 'solo', flat: true, bgColor: 'surface-light' },
      }"
    >
      <v-text-field
        v-if="!hideSearch"
        :model-value="search"
        label="Buscar"
        prepend-inner-icon="mdi-magnify"
        variant="solo"
        flat
        bg-color="surface-light"
        clearable
        hide-details
        class="flex-grow-1"
        style="max-width: 300px"
        :placeholder="searchPlaceholder"
        @update:model-value="emit('update:search', $event ?? '')"
      />
      <slot name="filters" />
      <v-spacer />
      <v-btn
        v-if="props.viewMode"
        icon
        variant="text"
        class="ml-2"
        :title="props.viewMode === 'table' ? 'Vista tarjetas' : 'Vista tabla'"
        @click="toggleView"
      >
        <v-icon>
          {{ props.viewMode === 'table' ? 'mdi-view-grid-outline' : 'mdi-view-list-outline' }}
        </v-icon>
      </v-btn>
      <slot name="actions" />
    </v-defaults-provider>
  </v-toolbar>
</template>
