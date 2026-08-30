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
  (e: 'update:options', options: { page: number; itemsPerPage: number }): void
  (e: 'view', employee: IEmployeeView): void
  (e: 'edit', employee: IEmployeeView): void
  (e: 'delete', employee: IEmployeeView): void
}>()

const initials = (employee: IEmployeeView) =>
  `${employee.firstName[0] ?? ''}${employee.lastName[0] ?? ''}`.toUpperCase()

const contractLabel = (value: string) =>
  CONTRACT_TYPE_LABELS[value] ?? value

// CommonDataCards expone items como Record<string, any>; se tipan aquí.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- slot genérico
const asEmployee = (item: Record<string, any>): IEmployeeView =>
  item as IEmployeeView
</script>

<template>
  <CommonDataCards
    :items="items"
    :loading="loading"
    :total="total"
    :page="page"
    :items-per-page="itemsPerPage"
    empty-text="No hay empleados registrados."
    @update:options="emit('update:options', $event)"
  >
    <template #default="{ item }">
      <v-card
        class="h-100 cursor-pointer"
        hover
        rounded="lg"
        @click="emit('view', asEmployee(item))"
      >
        <v-card-item>
          <template #prepend>
            <v-avatar color="primary" variant="tonal" size="44">
              <span class="text-subtitle-1 font-weight-bold">
                {{ initials(asEmployee(item)) }}
              </span>
            </v-avatar>
          </template>
          <v-card-title class="text-body-1 font-weight-bold text-wrap">
            {{ asEmployee(item).firstName }} {{ asEmployee(item).lastName }}
          </v-card-title>
          <v-card-subtitle class="text-body-2 text-truncate">
            {{ asEmployee(item).position }}
          </v-card-subtitle>
        </v-card-item>

        <v-card-text class="d-flex ga-2 pt-0">
          <v-chip size="x-small">
            {{ contractLabel(asEmployee(item).contractType) }}
          </v-chip>
          <v-chip
            size="x-small"
            variant="tonal"
            :color="asEmployee(item).active ? 'success' : 'error'"
          >
            {{ asEmployee(item).active ? 'Activo' : 'Inactivo' }}
          </v-chip>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            v-if="canDelete"
            icon="mdi-delete"
            size="small"
            variant="text"
            color="error"
            title="Eliminar"
            @click.stop="emit('delete', asEmployee(item))"
          />
          <v-btn
            icon="mdi-pencil"
            size="small"
            variant="text"
            title="Editar"
            @click.stop="emit('edit', asEmployee(item))"
          />
        </v-card-actions>
      </v-card>
    </template>
  </CommonDataCards>
</template>
