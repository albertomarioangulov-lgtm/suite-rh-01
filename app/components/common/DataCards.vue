<script setup lang="ts">
/**
 * Grid genérico de tarjetas con estados de carga/vacío y paginación.
 * El contenido de cada tarjeta se define con el slot por defecto.
 */

defineProps<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- slot genérico reutilizable
  items: Record<string, any>[]
  loading: boolean
  total: number
  page: number
  itemsPerPage: number
  emptyText?: string
}>()

const emit = defineEmits<{
  (e: 'update:options', options: { page: number; itemsPerPage: number }): void
}>()
</script>

<template>
  <div>
    <div v-if="loading" class="d-flex justify-center py-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <div v-else-if="!items?.length" class="text-center py-8 text-medium-emphasis">
      {{ emptyText || 'No hay registros.' }}
    </div>

    <v-row v-else density="compact">
      <v-col v-for="item in items" :key="item._id" cols="12" sm="6" md="4" lg="3">
        <slot :item="item" />
      </v-col>
    </v-row>

    <div v-if="!loading && total > itemsPerPage" class="d-flex justify-center mt-4">
      <v-pagination
        :model-value="page"
        :length="Math.ceil(total / itemsPerPage)"
        :total-visible="5"
        density="compact"
        @update:model-value="emit('update:options', { page: $event, itemsPerPage })"
      />
    </div>
  </div>
</template>
