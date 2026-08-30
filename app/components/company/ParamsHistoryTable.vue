<script setup lang="ts">
import type { ILegalParamsView } from '~/composables/states/useLegalParamsState'
import { formatDate } from '~~/shared/utils/datetime-helpers'

defineProps<{
  items: ILegalParamsView[]
  loading: boolean
  isAdmin: boolean
}>()

const emit = defineEmits<{
  (e: 'activate', id: string): void
}>()

const headers = [
  { title: 'Vigente desde', key: 'validFrom' },
  { title: 'Vigente hasta', key: 'validTo' },
  { title: 'UVT', key: 'uvtValue' },
  { title: 'SMMLV', key: 'minimumWage' },
  { title: 'Auxilio transporte', key: 'transportAllowance' },
  { title: 'ARL', key: 'arlRiskClass' },
  { title: 'Estado', key: 'active' },
  { title: 'Acciones', key: 'actions', sortable: false },
]
</script>

<template>
  <v-data-table :headers="headers" :items="items" :loading="loading" density="comfortable">
    <template #[`item.validFrom`]="{ item }">
      {{ formatDate(item.validFrom, 'DD/MM/YYYY') }}
    </template>
    <template #[`item.validTo`]="{ item }">
      {{ item.validTo ? formatDate(item.validTo, 'DD/MM/YYYY') : '—' }}
    </template>
    <template #[`item.uvtValue`]="{ item }">
      {{ Number(item.uvtValue).toLocaleString('es-CO') }}
    </template>
    <template #[`item.minimumWage`]="{ item }">
      ${{ Number(item.minimumWage).toLocaleString('es-CO') }}
    </template>
    <template #[`item.transportAllowance`]="{ item }">
      ${{ Number(item.transportAllowance).toLocaleString('es-CO') }}
    </template>
    <template #[`item.active`]="{ item }">
      <v-chip size="small" variant="tonal" :color="item.active ? 'success' : 'grey'">
        {{ item.active ? 'Vigente' : 'Histórico' }}
      </v-chip>
    </template>
    <template #[`item.actions`]="{ item }">
      <v-btn
        v-if="isAdmin && !item.active"
        size="small"
        color="primary"
        variant="tonal"
        prepend-icon="mdi-play-circle-outline"
        @click="emit('activate', item._id)"
      >
        Activar
      </v-btn>
    </template>
    <template #no-data> No hay períodos de parámetros registrados. </template>
  </v-data-table>
</template>
