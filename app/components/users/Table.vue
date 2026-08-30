<script setup lang="ts">
import { ROLE_LABELS, type AuthUser } from '~~/shared/auth'
import { formatDate } from '~~/shared/utils/datetime-helpers'
import { emailStatusMeta } from '~/utils/email-status'

const props = defineProps<{
  items: AuthUser[]
  total: number
  page: number
  itemsPerPage: number
  isAdmin: boolean
  currentUserId: string
}>()

const emit = defineEmits<{
  (e: 'update:options', options: unknown): void
  (e: 'edit' | 'view' | 'delete', user: AuthUser): void
}>()

const headers = [
  { title: 'Nombre', key: 'name' },
  { title: 'Email', key: 'email' },
  { title: 'Rol', key: 'role' },
  { title: 'Estado', key: 'active' },
  { title: 'Invitación', key: 'emailStatus' },
  { title: 'Creado', key: 'createdAt' },
  { title: 'Acciones', key: 'actions', sortable: false },
]

const canEdit = (user: AuthUser) => props.isAdmin || user._id === props.currentUserId

const canDelete = (user: AuthUser) => props.isAdmin && user._id !== props.currentUserId

const roleLabel = (rol: string) => ROLE_LABELS[rol as keyof typeof ROLE_LABELS] || rol
</script>

<template>
  <v-data-table-server
    :headers="headers"
    :items="items"
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
        {{ item.name }}
      </v-btn>
    </template>

    <template #[`item.role`]="{ item }">
      <v-chip size="small">{{ roleLabel(item.role) }}</v-chip>
    </template>

    <template #[`item.active`]="{ item }">
      <v-chip size="small" :color="item.active ? 'success' : 'error'">
        {{ item.active ? 'Activo' : 'Inactivo' }}
      </v-chip>
    </template>

    <template #[`item.emailStatus`]="{ item }">
      <v-chip size="small" variant="tonal" :color="emailStatusMeta(item.emailStatus).color">
        {{ emailStatusMeta(item.emailStatus).label }}
      </v-chip>
    </template>

    <template #[`item.createdAt`]="{ item }">
      {{ formatDate(item.createdAt) }}
    </template>

    <template #[`item.actions`]="{ item }">
      <v-btn
        v-if="canEdit(item)"
        icon="mdi-pencil"
        size="small"
        variant="text"
        title="Editar"
        @click="emit('edit', item)"
      />
      <v-btn
        v-if="canDelete(item)"
        icon="mdi-delete"
        size="small"
        variant="text"
        color="error"
        title="Eliminar"
        @click="emit('delete', item)"
      />
    </template>
  </v-data-table-server>
</template>
