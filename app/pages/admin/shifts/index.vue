<script setup lang="ts">
import { ROLES, type UserRole } from '~~/shared/auth'
import type { IShiftView } from '~/composables/states/useShiftState'
import { ShiftTable } from '#components'

definePageMeta({
  middleware: 'auth',
})

const { user } = useAuthState()
useModuleGuard()
const snackbar = useSnackbarState()
const {
  shifts,
  total,
  loading,
  error,
  fetchShifts,
  createShift,
  updateShift,
  deleteShift,
} = useShiftState()

const role = computed(() => user.value?.role)
const canManage = computed(
  () =>
    !!role.value &&
    ([ROLES.ADMIN, ROLES.MANAGER, ROLES.HR] as UserRole[]).includes(role.value),
)
const canDelete = computed(() => role.value === ROLES.ADMIN)

const search = ref('')
const typeFilter = ref('')
const activeFilter = ref('')
const options = ref({ page: 1, itemsPerPage: 10 })

const load = async () => {
  try {
    await fetchShifts({
      page: options.value.page,
      limit: options.value.itemsPerPage,
      search: search.value.trim() || undefined,
      type: typeFilter.value || undefined,
      active: activeFilter.value || undefined,
    })
  } catch {
    // Error visible en el VAlert.
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

onMounted(load)

const formOpen = ref(false)
const editingShift = ref<IShiftView | null>(null)

const openNew = () => {
  error.value = ''
  editingShift.value = null
  formOpen.value = true
}

const handleEdit = (shift: IShiftView) => {
  error.value = ''
  editingShift.value = shift
  formOpen.value = true
}

const onFormSaved = async (data: Record<string, unknown>) => {
  try {
    if (editingShift.value) {
      await updateShift(editingShift.value._id, data)
      snackbar.success('Turno actualizado')
    } else {
      await createShift(data)
      snackbar.success('Turno creado')
    }
    editingShift.value = null
    await load()
  } catch {
    // Error visible en el VAlert.
  }
}

const deleteOpen = ref(false)
const deletingShift = ref<IShiftView | null>(null)
const deleting = ref(false)

const confirmDelete = (shift: IShiftView) => {
  deletingShift.value = shift
  deleteOpen.value = true
}

const removeShift = async () => {
  if (!deletingShift.value) return
  deleting.value = true
  try {
    await deleteShift(deletingShift.value._id)
    deleteOpen.value = false
    snackbar.success('Turno desactivado')
    await load()
  } catch {
    // Error visible en el VAlert.
  }
  deleting.value = false
}

const handleView = (shift: IShiftView) => navigateTo(`/admin/shifts/${shift._id}`)
</script>

<template>
  <div>
    <CommonPageHeader
      title="Turnos"
      subtitle="Horarios fijos y rotativos del personal"
    >
      <template #actions>
        <v-btn
          v-if="canManage"
          color="primary"
          variant="tonal"
          prepend-icon="mdi-plus"
          @click="openNew"
        >
          Nuevo turno
        </v-btn>
      </template>
    </CommonPageHeader>

    <div v-if="canManage" class="position-relative">
      <v-progress-linear
        v-if="loading"
        indeterminate
        color="primary"
        height="4"
        class="position-absolute top-0 left-0 right-0"
        style="z-index: 1"
      />
      <CommonListToolbar
        :loading="loading"
        v-model:search="search"
        search-placeholder="Buscar turno"
        @update:search="debouncedSearch"
      >
        <template #filters>
          <v-select
            v-model="typeFilter"
            :items="[
              { title: 'Todos', value: '' },
              { title: 'Fijo', value: 'fixed' },
              { title: 'Rotativo', value: 'rotating' },
            ]"
            label="Tipo"
           
            style="max-width: 160px"
            @update:model-value="debouncedSearch()"
          />
          <v-select
            v-model="activeFilter"
            :items="[
              { title: 'Todos', value: '' },
              { title: 'Activos', value: 'true' },
              { title: 'Inactivos', value: 'false' },
            ]"
            label="Estado"
           
            style="max-width: 150px"
            @update:model-value="debouncedSearch()"
          />
        </template>
        <template #actions>
          <v-btn
            v-if="canManage"
            variant="text"
            prepend-icon="mdi-calendar-week"
            to="/admin/shifts/calendar"
          >
            Calendario
          </v-btn>
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

    
      <ShiftTable
        v-if="canManage"
        :items="shifts"
        :total="total"
        :loading="false"
        :page="options.page"
        :items-per-page="options.itemsPerPage"
        :can-delete="canDelete"
        @update:options="onUpdateOptions"
        @view="handleView"
        @edit="handleEdit"
        @delete="confirmDelete"
      />

    <v-alert
      v-else
      type="warning"
      variant="tonal"
      text="No tienes permisos para ver los turnos."
    />

    <ShiftFormDialog
      v-model="formOpen"
      :shift="editingShift"
      @saved="onFormSaved"
    />

    <v-dialog v-model="deleteOpen" max-width="420" persistent>
      <v-card>
        <v-card-title class="text-subtitle-1">Eliminar turno</v-card-title>
        <v-card-text>
          ¿Desactivar el turno
          <strong>{{ deletingShift?.name }}</strong
          >? No se eliminarán los historiales.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            color="grey-darken-1"
            @click="deleteOpen = false"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            :loading="deleting"
            :disabled="deleting"
            @click="removeShift"
          >
            Desactivar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
