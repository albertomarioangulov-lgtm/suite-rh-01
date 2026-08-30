<script setup lang="ts">
import { ROLE_LABELS, type AuthUser } from '~~/shared/auth'

const props = defineProps<{
  items: AuthUser[]
  total: number
  loading: boolean
  page: number
  itemsPerPage: number
  isAdmin: boolean
  currentUserId: string
}>()

const emit = defineEmits<{
  (e: 'update:options', options: { page: number; itemsPerPage: number }): void
  (e: 'edit' | 'view' | 'delete', user: AuthUser): void
}>()

const canEdit = (user: AuthUser) => props.isAdmin || user._id === props.currentUserId

const canDelete = (user: AuthUser) => props.isAdmin && user._id !== props.currentUserId

const initials = (user: AuthUser) =>
  user.name
    .split(' ')
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()

const roleLabel = (rol: string) => ROLE_LABELS[rol as keyof typeof ROLE_LABELS] || rol

// CommonDataCards expone items como Record<string, any>; aquí se tipan
// como AuthUser para los eventos/funciones del módulo.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- slot genérico
const asUser = (item: Record<string, any>): AuthUser => item as AuthUser
</script>

<template>
  <CommonDataCards
    :items="items"
    :loading="loading"
    :total="total"
    :page="page"
    :items-per-page="itemsPerPage"
    empty-text="No hay usuarios registrados."
    @update:options="emit('update:options', $event)"
  >
    <template #default="{ item }">
      <v-card class="h-100 cursor-pointer" hover rounded="lg" @click="emit('view', asUser(item))">
        <v-card-item>
          <template #prepend>
            <v-avatar color="primary" variant="tonal" size="44">
              <span class="text-subtitle-1 font-weight-bold">
                {{ initials(asUser(item)) }}
              </span>
            </v-avatar>
          </template>
          <v-card-title class="text-body-1 font-weight-bold text-wrap">
            {{ item.name }}
          </v-card-title>
          <v-card-subtitle class="text-body-2 text-truncate">
            {{ item.email }}
          </v-card-subtitle>
        </v-card-item>

        <v-card-text class="d-flex ga-2 pt-0">
          <v-chip size="x-small">{{ roleLabel(asUser(item).role) }}</v-chip>
          <v-chip size="x-small" variant="tonal" :color="item.active ? 'success' : 'error'">
            {{ item.active ? 'Activo' : 'Inactivo' }}
          </v-chip>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            v-if="canEdit(asUser(item))"
            icon="mdi-pencil"
            size="small"
            variant="text"
            title="Editar"
            @click.stop="emit('edit', asUser(item))"
          />
          <v-btn
            v-if="canDelete(asUser(item))"
            icon="mdi-delete"
            size="small"
            variant="text"
            color="error"
            title="Eliminar"
            @click.stop="emit('delete', asUser(item))"
          />
        </v-card-actions>
      </v-card>
    </template>
  </CommonDataCards>
</template>
