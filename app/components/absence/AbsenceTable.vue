<script setup lang="ts">
import {
  ABSENCE_STATUS_LABELS,
  ABSENCE_TYPE_LABELS,
  type AbsenceType,
} from '~~/shared/absence'
import { formatDate } from '~~/shared/utils/datetime-helpers'
import type { IAbsenceView } from '~/composables/states/useAbsenceState'

defineProps<{
  items: IAbsenceView[]
  total: number
  loading: boolean
  page: number
  itemsPerPage: number
  canManage: boolean
  canDelete: boolean
}>()

const emit = defineEmits<{
  (e: 'update:options', options: unknown): void
  (e: 'view', record: IAbsenceView): void
  (e: 'edit', record: IAbsenceView): void
  (e: 'approve', record: IAbsenceView): void
  (e: 'reject', record: IAbsenceView): void
  (e: 'delete', record: IAbsenceView): void
}>()

const headers = [
  { title: 'Empleado', key: 'employee' },
  { title: 'Tipo', key: 'type' },
  { title: 'Inicio', key: 'startDate' },
  { title: 'Fin', key: 'endDate' },
  { title: 'Días', key: 'days', align: 'end' },
  { title: 'Estado', key: 'status' },
  { title: 'Acciones', key: 'actions', sortable: false },
]

const employeeName = (record: IAbsenceView) => {
  const employee = record.employee
  if (typeof employee === 'object' && employee) {
    return `${employee.firstName} ${employee.lastName}`
  }
  return employee ?? ''
}

const typeLabel = (type: AbsenceType) => ABSENCE_TYPE_LABELS[type] ?? type
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
    <template #[`item.employee`]="{ item }">
      <v-btn
        variant="plain"
        color="primary"
        class="px-0 text-none font-weight-medium"
        @click="emit('view', item)"
      >
        {{ employeeName(item) }}
      </v-btn>
    </template>
    <template #[`item.type`]="{ item }">
      {{ typeLabel(item.type) }}
    </template>
    <template #[`item.startDate`]="{ item }">
      {{ formatDate(item.startDate, 'DD/MM/YYYY') }}
    </template>
    <template #[`item.endDate`]="{ item }">
      {{ formatDate(item.endDate, 'DD/MM/YYYY') }}
    </template>
    <template #[`item.status`]="{ item }">
      <AbsenceStatusBadge :status="item.status" />
    </template>
    <template #[`item.actions`]="{ item }">
      <div class="d-flex align-center">
        <v-btn
          v-if="canManage && item.status === 'pending'"
          icon
          size="small"
          color="success"
          title="Aprobar"
          @click="emit('approve', item)"
        >
          <v-icon>mdi-check</v-icon>
        </v-btn>
        <v-btn
          v-if="canManage && item.status === 'pending'"
          icon
          size="small"
          color="error"
          title="Rechazar"
          @click="emit('reject', item)"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-btn
          v-if="item.status === 'pending'"
          icon
          size="small"
          title="Editar"
          @click="emit('edit', item)"
        >
          <v-icon>mdi-pencil</v-icon>
        </v-btn>
        <v-btn
          v-if="canDelete && item.status === 'pending'"
          icon
          size="small"
          color="error"
          title="Eliminar"
          @click="emit('delete', item)"
        >
          <v-icon>mdi-trash-can-outline</v-icon>
        </v-btn>
        <v-chip
          v-if="item.rejectionReason"
          size="x-small"
          color="error"
          variant="tonal"
          class="ml-1"
        >
          {{ ABSENCE_STATUS_LABELS.rejected }}
        </v-chip>
      </div>
    </template>
  </v-data-table-server>
</template>
