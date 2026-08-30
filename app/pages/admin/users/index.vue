<script setup lang="ts">
import { ROLES, type AuthUser } from '~~/shared/auth'
import { UsersCards, UsersTable } from '#components'

definePageMeta({
  middleware: 'auth',
})

const { user } = useAuthState()
const snackbar = useSnackbarState()
const { users, total, loading, error, pagination, filters, fetchUsers, deleteUser } = useUserState()

const roleOptions = [
  { title: 'Administrador', value: ROLES.ADMIN },
  { title: 'Gerente', value: ROLES.MANAGER },
  { title: 'Recursos Humanos', value: ROLES.HR },
  { title: 'Empleado', value: ROLES.EMPLOYEE },
]

const options = ref({
  page: 1,
  itemsPerPage: 10,
  sortBy: [] as { key: string; order: 'asc' | 'desc' }[],
})

const { viewMode } = useViewMode('admin-users-view-mode')

const isAdmin = computed(() => user.value?.role === ROLES.ADMIN)

const load = async () => {
  try {
    await fetchUsers({
      page: options.value.page,
      limit: options.value.itemsPerPage,
      search: filters.value.search.trim() || undefined,
      role: filters.value.role,
      sortBy: options.value.sortBy[0]?.key,
      sortOrder: options.value.sortBy[0]?.order,
    })
  } catch {
    // El error queda en useUserState().error y se muestra en el VAlert.
  }
}

const debouncedSearch = useDebounceFn(() => {
  options.value.page = 1
  load()
}, 400)

const onUpdateOptions = (value: unknown) => {
  const next = value as Partial<typeof options.value>
  options.value = { ...options.value, ...next }
  pagination.value = {
    ...pagination.value,
    page: options.value.page,
    itemsPerPage: options.value.itemsPerPage,
  }
  load()
}

onMounted(load)

// ---- Eliminar ----
const deleteOpen = ref(false)
const deletingUser = ref<AuthUser | null>(null)
const deleting = ref(false)

const confirmDelete = (authUser: AuthUser) => {
  deletingUser.value = authUser
  deleteOpen.value = true
}

const formOpen = ref(false)
const editingUser = ref<AuthUser | null>(null)

const openNew = () => {
  error.value = ''
  editingUser.value = null
  formOpen.value = true
}

const removeUser = async () => {
  if (!deletingUser.value) return
  deleting.value = true
  try {
    await deleteUser(deletingUser.value._id)
    deleteOpen.value = false
    await load()
    snackbar.success('Usuario eliminado')
  } catch {
    // Error visible en el VAlert.
  }
  deleting.value = false
}

const handleEdit = (authUser: AuthUser) => {
  error.value = ''
  editingUser.value = authUser
  formOpen.value = true
}

const handleView = (authUser: AuthUser) => {
  navigateTo(`/admin/users/${authUser._id}`)
}

const onFormSaved = async () => {
  await load()
  snackbar.success('Usuario guardado correctamente')
}
</script>

<template>
  <div>
    <CommonPageHeader
      title="Usuarios"
      subtitle="Administra usuarios, roles y accesos al sistema"
      help-topic="usuarios"
    >
      <template #actions>
        <v-btn
          v-if="isAdmin"
          color="primary"
          variant="tonal"
          prepend-icon="mdi-plus"
          @click="openNew"
        >
          Nuevo
        </v-btn>
      </template>
    </CommonPageHeader>

    <div>
      <CommonListToolbar
        :loading="loading"
        v-model:search="filters.search"
        v-model:view-mode="viewMode"
        @update:search="debouncedSearch"
      >
        <template #filters>
          <v-select
            v-model="filters.role"
            :items="roleOptions"
            label="Rol"
            clearable
            item-title="title"
            item-value="value"
           
            style="max-width: 200px"
            @update:model-value="debouncedSearch()"
          />
        </template>
      </CommonListToolbar>
    </div>

    <v-alert
      v-if="error"
      type="error"
      density="compact"
      variant="tonal"
      class="mb-3"
      :text="error"
      closable
      @click:close="error = ''"
    />

    <ClientOnly>
      
      <UsersTable
        v-if="viewMode === 'table'"
        :items="users"
          :total="total"
          :page="options.page"
          :items-per-page="options.itemsPerPage"
          :is-admin="isAdmin"
          :current-user-id="user?._id ?? ''"
          @update:options="onUpdateOptions"
          @edit="handleEdit"
          @view="handleView"
          @delete="confirmDelete"
        />

      <UsersCards
        v-else
        :items="users"
        :loading="false"
        :total="total"
        :page="options.page"
        :items-per-page="options.itemsPerPage"
        :is-admin="isAdmin"
        :current-user-id="user?._id ?? ''"
        @update:options="onUpdateOptions"
        @edit="handleEdit"
        @view="handleView"
        @delete="confirmDelete"
      />
    </ClientOnly>

    <UsersFormDialog v-model="formOpen" :user="editingUser" @saved="onFormSaved" />

    <v-dialog v-model="deleteOpen" max-width="420" persistent>
      <v-card>
        <v-card-title class="text-subtitle-1">Eliminar usuario</v-card-title>
        <v-card-text>
          ¿Seguro que quieres eliminar a
          <strong>{{ deletingUser?.name }}</strong
          >? Esta acción no se puede deshacer.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" color="grey-darken-1" @click="deleteOpen = false"> Cancelar </v-btn>
          <v-btn
            color="error"
            variant="flat"
            :loading="deleting"
            :disabled="deleting"
            @click="removeUser"
          >
            Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
