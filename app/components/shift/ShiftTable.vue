<script setup lang="ts">
import type { IShiftView } from '~/composables/states/useShiftState'

defineProps<{
  items: IShiftView[]
  total: number
  loading: boolean
  page: number
  itemsPerPage: number
  canDelete: boolean
}>()

const emit = defineEmits<{
  (e: 'update:options', options: unknown): void
  (e: 'view', shift: IShiftView): void
  (e: 'edit', shift: IShiftView): void
  (e: 'delete', shift: IShiftView): void
}>()

const DAY_ABBR = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const daysSummary = (shift: IShiftView) => {
  const active = (shift.days ?? []).filter((day) => day.active !== false)
  const names = active.map((day) => DAY_ABBR[day.dayOfWeek] ?? '').join(' · ')
  const weekly = active.reduce((acc, day) => acc + (day.workHours ?? 0), 0)
  return `${names} · ${weekly.toFixed(1)}h`
}

const typeLabel = (type: string) => (type === 'fixed' ? 'Fijo' : 'Rotativo')

const headers = [
  { title: 'Turno', key: 'name' },
  { title: 'Tipo', key: 'type' },
  { title: 'Días programados', key: 'days' },
  { title: 'Estado', key: 'active' },
  { title: 'Acciones', key: 'actions', sortable: false },
]
</script>

<template>
  <v-data-table-server
    :headers="headers"
    :items="items"
    :loading="loading"
    :items-length="total"
    :items-per-page="itemsPerPage"
    :page="page"
    :items-per-page-options="[5, 10, 25, 50]"
    @update:options="emit('update:options', $event)"
  >
    <template #[`item.name`]="{ item }">
      <v-btn
        variant="plain"
        color="primary"
        class="px-0 text-none font-weight-medium"
        @click="emit('view', item)"
      >
        <ShiftBadge :name="item.name" :color="item.color" class="mr-2" />
        {{ item.name }}
      </v-btn>
    </template>
    <template #[`item.type`]="{ item }">
      {{ typeLabel(item.type) }}
    </template>
    <template #[`item.days`]="{ item }">
      {{ daysSummary(item) }}
    </template>
    <template #[`item.active`]="{ item }">
      <v-chip size="small" variant="tonal" :color="item.active ? 'success' : 'grey'">
        {{ item.active ? 'Activo' : 'Inactivo' }}
      </v-chip>
    </template>
    <template #[`item.actions`]="{ item }">
      <v-btn
        icon="mdi-eye-outline"
        size="small"
        variant="text"
        title="Ver"
        @click="emit('view', item)"
      />
      <v-btn
        icon="mdi-pencil"
        size="small"
        variant="text"
        title="Editar"
        @click="emit('edit', item)"
      />
      <v-btn
        v-if="canDelete"
        icon="mdi-delete"
        size="small"
        variant="text"
        color="error"
        title="Eliminar"
        @click="emit('delete', item)"
      />
    </template>
    <template #no-data>
      No hay turnos registrados.
    </template>
  </v-data-table-server>
</template>
