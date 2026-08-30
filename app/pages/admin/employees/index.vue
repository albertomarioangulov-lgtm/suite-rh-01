<script setup lang="ts">
import { ROLES, type UserRole } from '~~/shared/auth'
import type {
  IEmployeePayload,
  IEmployeeView,
} from '~/composables/states/useEmployeeState'
import { EmployeesCards, EmployeesTable } from '#components'

definePageMeta({
  middleware: 'auth',
})

const { user } = useAuthState()
useModuleGuard()
const snackbar = useSnackbarState()
const {
  employees,
  total,
  loading,
  error,
  fetchEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} = useEmployeeState()

const role = computed(() => user.value?.role)
const canManage = computed(
  () =>
    !!role.value &&
    ([ROLES.ADMIN, ROLES.MANAGER, ROLES.HR] as UserRole[]).includes(role.value),
)
const canDelete = computed(() => role.value === ROLES.ADMIN)

const { viewMode } = useViewMode('admin-employees-view-mode')

const search = ref('')
const activeFilter = ref('')
const options = ref({ page: 1, itemsPerPage: 10 })

const load = async () => {
  try {
    await fetchEmployees({
      page: options.value.page,
      limit: options.value.itemsPerPage,
      search: search.value.trim() || undefined,
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

// ---- Crear / editar (modal) ----
const formOpen = ref(false)
const editingEmployee = ref<IEmployeeView | null>(null)

const openNew = () => {
  error.value = ''
  editingEmployee.value = null
  formOpen.value = true
}

const handleEdit = (employee: IEmployeeView) => {
  error.value = ''
  editingEmployee.value = employee
  formOpen.value = true
}

const onFormSaved = async (data: Record<string, unknown>) => {
  try {
    if (editingEmployee.value) {
      await updateEmployee(
        editingEmployee.value._id,
        data as IEmployeePayload,
      )
      snackbar.success('Empleado actualizado correctamente')
    } else {
      await createEmployee(data as IEmployeePayload)
      snackbar.success('Empleado creado correctamente')
    }
    editingEmployee.value = null
    await load()
  } catch {
    // Error visible en el VAlert.
  }
}

// ---- Eliminar ----
const deleteOpen = ref(false)
const deletingEmployee = ref<IEmployeeView | null>(null)
const deleting = ref(false)

const confirmDelete = (employee: IEmployeeView) => {
  deletingEmployee.value = employee
  deleteOpen.value = true
}

const removeEmployee = async () => {
  if (!deletingEmployee.value) return
  deleting.value = true
  try {
    await deleteEmployee(deletingEmployee.value._id)
    deleteOpen.value = false
    snackbar.success('Empleado eliminado')
    await load()
  } catch {
    // Error visible en el VAlert.
  }
  deleting.value = false
}

const handleView = (employee: IEmployeeView) =>
  navigateTo(`/admin/employees/${employee._id}`)
</script>

<template>
  <div>
    <CommonPageHeader
      title="Empleados"
      subtitle="Gestión del personal de la empresa"
    >
      <template #actions>
        <v-btn
          v-if="canManage"
          color="primary"
          variant="tonal"
          prepend-icon="mdi-plus"
          @click="openNew"
        >
          Nuevo
        </v-btn>
      </template>
    </CommonPageHeader>

    <div v-if="canManage">
      <CommonListToolbar
        :loading="false"
        v-model:search="search"
        v-model:view-mode="viewMode"
        @update:search="debouncedSearch"
      >
        <template #filters>
          <v-select
            v-model="activeFilter"
            :items="[
              { title: 'Todos', value: '' },
              { title: 'Activos', value: 'true' },
              { title: 'Inactivos', value: 'false' },
            ]"
            label="Estado"
           
            style="max-width: 180px"
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

    
      <EmployeesTable
        v-if="canManage && viewMode === 'table'"
        :items="employees"
        :total="total"
        :loading="loading"
        :page="options.page"
        :items-per-page="options.itemsPerPage"
        :can-delete="canDelete"
        @update:options="onUpdateOptions"
        @view="handleView"
        @edit="handleEdit"
        @delete="confirmDelete"
      />

    <EmployeesCards
      v-else-if="canManage"
      :items="employees"
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
      text="No tienes permisos para ver la gestión de empleados."
    />

    <EmployeesFormDialog
      v-model="formOpen"
      :employee="editingEmployee"
      @saved="onFormSaved"
    />

    <v-dialog v-model="deleteOpen" max-width="420" persistent>
      <v-card>
        <v-card-title class="text-subtitle-1">Eliminar empleado</v-card-title>
        <v-card-text>
          ¿Seguro que quieres eliminar a
          <strong
            >{{ deletingEmployee?.firstName }}
            {{ deletingEmployee?.lastName }}</strong
          >? Esta acción no se puede deshacer.
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
            @click="removeEmployee"
          >
            Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
