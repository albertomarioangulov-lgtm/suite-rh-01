<script setup lang="ts">
import { CONTRACT_TYPE_LABELS } from '~/utils/contract-types'
import type { IEmployeeView } from '~/composables/states/useEmployeeState'

defineProps<{
  items: IEmployeeView[]
  total: number
  loading: boolean
  page: number
  itemsPerPage: number
  canDelete: boolean
}>()

const emit = defineEmits<{
  (e: 'update:options', options: unknown): void
  (e: 'view', employee: IEmployeeView): void
  (e: 'edit', employee: IEmployeeView): void
  (e: 'delete', employee: IEmployeeView): void
}>()

const headers = [
  { title: 'Documento', key: 'document' },
  { title: 'Nombre', key: 'name' },
  { title: 'Email', key: 'email' },
  { title: 'Cargo', key: 'position' },
  { title: 'Área', key: 'department' },
  { title: 'Contrato', key: 'contractType' },
  { title: 'Salario', key: 'baseSalary' },
  { title: 'Estado', key: 'active' },
  { title: 'Acciones', key: 'actions', sortable: false },
]

const contractLabel = (value: string) =>
  CONTRACT_TYPE_LABELS[value] ?? value

const departmentName = (employee: IEmployeeView) =>
  employee.department && typeof employee.department === 'object'
    ? employee.department.name ?? ''
    : ''
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
        {{ item.firstName }} {{ item.lastName }}
      </v-btn>
    </template>
    <template #[`item.contractType`]="{ item }">
      {{ contractLabel(item.contractType) }}
    </template>
    <template #[`item.department`]="{ item }">
      {{ departmentName(item) }}
    </template>
    <template #[`item.baseSalary`]="{ item }">
      ${{ Number(item.baseSalary).toLocaleString('es-CO') }}
    </template>
    <template #[`item.active`]="{ item }">
      <v-chip size="small" variant="tonal" :color="item.active ? 'success' : 'error'">
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
      No hay empleados registrados.
    </template>
  </v-data-table-server>
</template>
