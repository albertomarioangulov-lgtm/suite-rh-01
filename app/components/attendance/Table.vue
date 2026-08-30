<script setup lang="ts">
import { formatDate, formatTime } from '~~/shared/utils/datetime-helpers'
import type { IAttendanceRecord } from '~/composables/states/useAttendanceState'

defineProps<{
  items: IAttendanceRecord[]
  total: number
  loading: boolean
  page: number
  itemsPerPage: number
  canManage: boolean
  canDelete: boolean
}>()

const emit = defineEmits<{
  (e: 'update:options', options: unknown): void
  (e: 'view', record: IAttendanceRecord): void
  (e: 'edit', record: IAttendanceRecord): void
  (e: 'approve', record: IAttendanceRecord): void
  (e: 'reject', record: IAttendanceRecord): void
  (e: 'delete', record: IAttendanceRecord): void
}>()

const headers = [
  { title: 'Empleado', key: 'employee' },
  { title: 'Fecha', key: 'date' },
  { title: 'Entrada', key: 'clockIn' },
  { title: 'Salida', key: 'clockOut' },
  { title: 'Horas', key: 'hoursWorked' },
  { title: 'Extras D', key: 'overtimeDayHours' },
  { title: 'Extras N', key: 'overtimeNightHours' },
  { title: 'Estado', key: 'status' },
  { title: 'Acciones', key: 'actions', sortable: false },
]

const employeeName = (record: IAttendanceRecord) => {
  const employee = record.employee
  if (typeof employee === 'object' && employee) {
    return `${employee.firstName} ${employee.lastName}`
  }
  return employee || '—'
}
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
    <template #[`item.date`]="{ item }">
      {{ formatDate(item.date, 'DD/MM/YYYY') }}
    </template>
    <template #[`item.clockIn`]="{ item }">
      {{ formatTime(item.clockIn) }}
    </template>
    <template #[`item.clockOut`]="{ item }">
      {{ formatTime(item.clockOut) }}
    </template>
    <template #[`item.hoursWorked`]="{ item }">
      {{ item.hoursWorked.toFixed(1) }}h
    </template>
    <template #[`item.overtimeDayHours`]="{ item }">
      {{ item.overtimeDayHours.toFixed(1) }}h
    </template>
    <template #[`item.overtimeNightHours`]="{ item }">
      {{ item.overtimeNightHours.toFixed(1) }}h
    </template>
    <template #[`item.status`]="{ item }">
      <AttendanceStatusBadge :status="item.status" />
    </template>
    <template #[`item.actions`]="{ item }">
      <v-btn
        icon="mdi-eye-outline"
        size="small"
        variant="text"
        title="Ver"
        @click="emit('view', item)"
      />
      <template v-if="canManage && item.status === 'pending'">
        <v-btn
          icon="mdi-check"
          size="small"
          variant="text"
          color="success"
          title="Aprobar"
          @click="emit('approve', item)"
        />
        <v-btn
          icon="mdi-close"
          size="small"
          variant="text"
          color="error"
          title="Rechazar"
          @click="emit('reject', item)"
        />
        <v-btn
          icon="mdi-pencil"
          size="small"
          variant="text"
          title="Editar"
          @click="emit('edit', item)"
        />
      </template>
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
      No hay registros de asistencia.
    </template>
  </v-data-table-server>
</template>
