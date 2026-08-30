<script setup lang="ts">
import { formatDate } from '~~/shared/utils/datetime-helpers'
import { formatCOP } from '~/utils/number-helpers'
import type { IPayrollView } from '~/composables/states/usePayrollState'

defineProps<{
  items: IPayrollView[]
  total: number
  loading: boolean
  page: number
  itemsPerPage: number
  canApprove: boolean
  canPay: boolean
  canCancel: boolean
}>()

const emit = defineEmits<{
  (e: 'update:options', options: unknown): void
  (e: 'view', payroll: IPayrollView): void
  (e: 'approve', payroll: IPayrollView): void
  (e: 'pay', payroll: IPayrollView): void
  (e: 'cancel', payroll: IPayrollView): void
}>()

const headers = [
  { title: 'Período', key: 'period' },
  { title: 'Estado', key: 'status' },
  { title: 'Empleados', key: 'employeeCount' },
  { title: 'Total devengado', key: 'totalEarned' },
  { title: 'Total a pagar', key: 'totalToPay' },
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
    <template #[`item.period`]="{ item }">
      {{ formatDate(item.periodStart, 'DD/MM/YYYY') }} – {{ formatDate(item.periodEnd, 'DD/MM/YYYY') }}
    </template>
    <template #[`item.status`]="{ item }">
      <PayrollStatusBadge :status="item.status" />
    </template>
    <template #[`item.employeeCount`]="{ item }">
      {{ item.employees?.length ?? 0 }}
    </template>
    <template #[`item.totalEarned`]="{ item }">
      {{ formatCOP(item.totalEarned) }}
    </template>
    <template #[`item.totalToPay`]="{ item }">
      {{ formatCOP(item.totalToPay) }}
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
        v-if="canApprove && item.status === 'draft'"
        icon="mdi-check"
        size="small"
        variant="text"
        color="success"
        title="Aprobar"
        @click="emit('approve', item)"
      />
      <v-btn
        v-if="canPay && item.status === 'approved'"
        icon="mdi-cash"
        size="small"
        variant="text"
        color="primary"
        title="Pagar"
        @click="emit('pay', item)"
      />
      <v-btn
        v-if="canCancel && ['draft', 'approved'].includes(item.status)"
        icon="mdi-cancel"
        size="small"
        variant="text"
        color="error"
        title="Anular"
        @click="emit('cancel', item)"
      />
    </template>
    <template #no-data>
      No hay nóminas registradas.
    </template>
  </v-data-table-server>
</template>
