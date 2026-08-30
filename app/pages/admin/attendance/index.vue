<script setup lang="ts">
import { ROLES, type UserRole } from '~~/shared/auth'
import type { IAttendanceRecord } from '~/composables/states/useAttendanceState'
import { AttendanceTable } from '#components'
import { API_PATHS } from '~/utils/api-paths'

definePageMeta({
  middleware: 'auth',
})

const { user, authFetch } = useAuthState()
useModuleGuard()
const snackbar = useSnackbarState()
const {
  records,
  loading,
  error,
  pagination,
  filters,
  fetchRecords,
  createRecord,
  updateRecord,
  deleteRecord,
  approveRecord,
  rejectRecord,
  setFilter,
} = useAttendanceState()

const role = computed(() => user.value?.role)
const route = useRoute()
const canManage = computed(
  () =>
    !!role.value &&
    ([ROLES.ADMIN, ROLES.MANAGER, ROLES.HR] as UserRole[]).includes(role.value),
)
const canDelete = computed(() => role.value === ROLES.ADMIN)

const options = ref({ page: 1, itemsPerPage: 10 })
const employeeOptions = ref<Array<{ title: string; value: string }>>([])

onMounted(async () => {
  if (route.query.employeeId) {
    setFilter('employeeId', String(route.query.employeeId))
  }
  load()
  if (canManage.value) {
    try {
      const data = await authFetch<{
        items: Array<{ _id: string; firstName: string; lastName: string; document: string }>
      }>(API_PATHS.employees.list, { query: { limit: 100, active: 'true' } })
      employeeOptions.value = data.items.map((employee) => ({
        title: `${employee.firstName} ${employee.lastName} (${employee.document})`,
        value: employee._id,
      }))
    } catch {
      // Error silencioso.
    }
  }
})

const load = async () => {
  try {
    await fetchRecords({
      page: options.value.page,
      limit: options.value.itemsPerPage,
      employeeId: filters.value.employeeId || undefined,
      status: filters.value.status || undefined,
      dateFrom: filters.value.dateFrom || undefined,
      dateTo: filters.value.dateTo || undefined,
    })
  } catch {
    // Error visible en el VAlert.
  }
}

const onUpdateOptions = (value: unknown) => {
  const next = value as Partial<typeof options.value>
  options.value = { ...options.value, ...next }
  load()
}

// ---- Modal crear/editar ----
const formOpen = ref(false)
const editingRecord = ref<IAttendanceRecord | null>(null)

const openNew = () => {
  error.value = ''
  editingRecord.value = null
  formOpen.value = true
}

const handleEdit = (record: IAttendanceRecord) => {
  error.value = ''
  editingRecord.value = record
  formOpen.value = true
}

const onFormSaved = async (data: Record<string, unknown>) => {
  try {
    if (editingRecord.value) {
      await updateRecord(editingRecord.value._id, data)
      snackbar.success('Registro actualizado')
    } else {
      await createRecord(data)
      snackbar.success('Asistencia registrada')
    }
    editingRecord.value = null
    await load()
  } catch {
    // Error visible en el VAlert.
  }
}

// ---- Estado y eliminación ----
const deleteOpen = ref(false)
const deletingRecord = ref<IAttendanceRecord | null>(null)
const deleting = ref(false)

const confirmDelete = (record: IAttendanceRecord) => {
  deletingRecord.value = record
  deleteOpen.value = true
}

const removeRecord = async () => {
  if (!deletingRecord.value) return
  deleting.value = true
  try {
    await deleteRecord(deletingRecord.value._id)
    deleteOpen.value = false
    snackbar.success('Registro eliminado')
    await load()
  } catch {
    // Error visible en el VAlert.
  }
  deleting.value = false
}

const handleApprove = async (record: IAttendanceRecord) => {
  try {
    await approveRecord(record._id)
    snackbar.success('Registro aprobado')
    await load()
  } catch {
    // Error visible en el VAlert.
  }
}

const handleReject = async (record: IAttendanceRecord) => {
  try {
    await rejectRecord(record._id)
    snackbar.success('Registro rechazado')
    await load()
  } catch {
    // Error visible en el VAlert.
  }
}

const handleView = (record: IAttendanceRecord) =>
  navigateTo(`/admin/attendance/${record._id}`)
</script>

<template>
  <div>
    <CommonPageHeader
      title="Asistencia"
      subtitle="Control de entrada/salida y cálculo de horas extras"
    >
      <template #actions>
        <v-btn
          v-if="canManage"
          color="primary"
          variant="tonal"
          prepend-icon="mdi-plus"
          @click="openNew"
        >
          Nuevo registro
        </v-btn>
      </template>
    </CommonPageHeader>

    <div v-if="canManage">
      <CommonListToolbar hide-search :loading="loading">
        <template #filters>
          <v-autocomplete
            v-model="filters.employeeId"
            :items="employeeOptions"
            label="Empleado"
            item-title="title"
            item-value="value"
            clearable
           
            style="max-width: 300px"
            @update:model-value="setFilter('employeeId', $event); options.page = 1; load()"
          />
          <v-select
            v-model="filters.status"
            :items="[
              { title: 'Todos los estados', value: '' },
              { title: 'Pendiente', value: 'pending' },
              { title: 'Aprobado', value: 'approved' },
              { title: 'Rechazado', value: 'rejected' },
            ]"
            label="Estado"
           
            style="max-width: 180px"
            @update:model-value="setFilter('status', $event); options.page = 1; load()"
          />
          <v-text-field
            v-model="filters.dateFrom"
            label="Desde"
            type="date"
           
            style="max-width: 170px"
            @update:model-value="setFilter('dateFrom', $event); options.page = 1; load()"
          />
          <v-text-field
            v-model="filters.dateTo"
            label="Hasta"
            type="date"
           
            style="max-width: 170px"
            @update:model-value="setFilter('dateTo', $event); options.page = 1; load()"
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

    
      <AttendanceTable
        v-if="canManage"
        :items="records"
        :total="pagination.total"
        :loading="false"
        :page="options.page"
        :items-per-page="options.itemsPerPage"
        :can-manage="canManage"
        :can-delete="canDelete"
        @update:options="onUpdateOptions"
        @view="handleView"
        @edit="handleEdit"
        @approve="handleApprove"
        @reject="handleReject"
        @delete="confirmDelete"
      />

    <v-alert
      v-else
      type="warning"
      variant="tonal"
      text="No tienes permisos para ver la asistencia."
    />

    <AttendanceFormDialog
      v-model="formOpen"
      :record="editingRecord"
      @saved="onFormSaved"
    />

    <v-dialog v-model="deleteOpen" max-width="420" persistent>
      <v-card>
        <v-card-title class="text-subtitle-1">Eliminar registro</v-card-title>
        <v-card-text>
          ¿Seguro que quieres eliminar este registro de asistencia? Esta
          acción no se puede deshacer.
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
            @click="removeRecord"
          >
            Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
