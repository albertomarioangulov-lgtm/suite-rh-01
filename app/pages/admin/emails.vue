<script setup lang="ts">
import { ROLES } from '~~/shared/auth'
import { formatDate } from '~~/shared/utils/datetime-helpers'
import { emailStatusMeta } from '~/utils/email-status'
import { API_PATHS } from '~/utils/api-paths'

definePageMeta({
  middleware: 'auth',
})

const { user, authFetch } = useAuthState()
const isAdmin = computed(() => user.value?.role === ROLES.ADMIN || user.value?.role === ROLES.SUPERADMIN)

interface IEmailLogItem {
  _id: string
  email: string
  type: string
  latestStatus: string
  lastEventAt?: string
  createdAt?: string
  history?: Array<{
    status: string
    eventName?: string
    eventAt?: string
  }>
}

const items = ref<IEmailLogItem[]>([])
const total = ref(0)
const loading = ref(false)
const search = ref('')
const options = ref({ page: 1, itemsPerPage: 10 })

const load = async () => {
  loading.value = true
  try {
    const data = await authFetch<{ items: IEmailLogItem[]; total: number }>(API_PATHS.emails.list, {
      query: {
        page: options.value.page,
        limit: options.value.itemsPerPage,
        search: search.value.trim() || undefined,
      },
    })
    items.value = data.items
    total.value = data.total
  } catch {
    // Error silencioso: la tabla muestra vacío.
  } finally {
    loading.value = false
  }
}

const debouncedSearch = useDebounceFn(() => {
  options.value.page = 1
  load()
}, 400)

const onUpdateOptions = (value: unknown) => {
  const next = value as Partial<typeof options.value>
  options.value = { ...options.value, ...next }
  load()
}

onMounted(() => {
  if (isAdmin.value) load()
})
</script>

<template>
  <div>
    <CommonPageHeader title="Emails" subtitle="Historial de correos enviados e invitaciones" />

    <template v-if="isAdmin">
      <CommonListToolbar
        :loading="loading"
        v-model:search="search"
        search-placeholder="Buscar por correo"
        @update:search="debouncedSearch"
      />

      <v-card>
        <v-data-table-server
          :headers="[
            { title: 'Correo', key: 'email' },
            { title: 'Tipo', key: 'type' },
            { title: 'Estado', key: 'latestStatus' },
            { title: 'Eventos', key: 'events' },
            { title: 'Última fecha', key: 'lastEventAt' },
          ]"
          :items="items"
          :loading="false"
          :items-length="total"
          :items-per-page="options.itemsPerPage"
          :page="options.page"
          :items-per-page-options="[10, 25, 50]"
          @update:options="onUpdateOptions"
        >
          <template #[`item.type`]="{ item }">
            {{ item.type === 'invite' ? 'Invitación' : item.type }}
          </template>
          <template #[`item.latestStatus`]="{ item }">
            <v-chip size="small" variant="tonal" :color="emailStatusMeta(item.latestStatus).color">
              {{ emailStatusMeta(item.latestStatus).label }}
            </v-chip>
          </template>
          <template #[`item.events`]="{ item }">
            {{ item.history?.length ?? 0 }}
          </template>
          <template #[`item.lastEventAt`]="{ item }">
            {{ formatDate(item.lastEventAt || item.createdAt, 'DD/MM/YYYY HH:mm') }}
          </template>
        </v-data-table-server>
      </v-card>
    </template>

    <v-alert
      v-else
      type="warning"
      variant="tonal"
      text="No tienes permisos para ver el historial de correos."
    />
  </div>
</template>
