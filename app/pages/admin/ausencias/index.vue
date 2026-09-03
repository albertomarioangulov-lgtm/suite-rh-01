<script setup lang="ts">
import { ROLES, type UserRole } from '~~/shared/auth'
import { ABSENCE_TYPE_LIST, ABSENCE_TYPE_LABELS } from '~~/shared/absence'
import type { IAbsenceView } from '~/composables/states/useAbsenceState'
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
} = useAbsenceState()

const role = computed(() => user.value?.role)
const canManage = computed(
  () =>
    !!role.value &&
    ([ROLES.ADMIN, ROLES.MANAGER, ROLES.HR, ROLES.SUPERADMIN] as UserRole[]).includes(role.value),
)
const canDelete = computed(() => role.value === ROLES.ADMIN || role.value === ROLES.SUPERADMIN)

const options = ref({ page: 1, itemsPerPage: 10 })
const employeeOptions = ref<Array<{ title: string; value: string }>>([])
const typeOptions = ABSENCE_TYPE_LIST.map((type) => ({
  title: ABSENCE_TYPE_LABELS[type],
  value: type,
}))

onMounted(async () => {
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
      type: filters.value.type || undefined,
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
const editingRecord = ref<IAbsenceView | null>(null)

const openNew = () => {
  error.value = ''
  editingRecord.value = null
  formOpen.value = true
}

const handleEdit = (record: IAbsenceView) => {
  error.value = ''
  editingRecord.value = record
  formOpen.value = true
}

const onFormSaved = async (data: Record<string, unknown>) => {
  try {
    if (editingRecord.value) {
      await updateRecord(editingRecord.value._id, data)
      snackbar.success('Ausencia actualizada')
    } else {
      await createRecord(data)
      snackbar.success('Ausencia registrada')
    }
    editingRecord.value = null
    await load()
  } catch {
    // Error visible en el VAlert.
  }
}

// ---- Aprobación / rechazo ----
const rejectOpen = ref(false)
const rejectingRecord = ref<IAbsenceView | null>(null)
const rejectReason = ref('')
const savingAction = ref(false)

const handleApprove = async (record: IAbsenceView) => {
  try {
    await approveRecord(record._id)
    snackbar.success('Ausencia aprobada')
    await load()
  } catch {
    // Error visible en el VAlert.
  }
}

const openReject = (record: IAbsenceView) => {
  rejectReason.value = ''
  rejectingRecord.value = record
  rejectOpen.value = true
}

const doReject = async () => {
  if (!rejectingRecord.value || !rejectReason.value.trim()) return
  savingAction.value = true
  try {
    await rejectRecord(rejectingRecord.value._id, rejectReason.value.trim())
    rejectOpen.value = false
    snackbar.success('Ausencia rechazada')
    await load()
  } catch {
    // Error visible en el VAlert.
  }
  savingAction.value = false
}

// ---- Eliminación ----
const deleteOpen = ref(false)
const deletingRecord = ref<IAbsenceView | null>(null)
const deleting = ref(false)

const confirmDelete = (record: IAbsenceView) => {
  deletingRecord.value = record
  deleteOpen.value = true
}

const removeRecord = async () => {
  if (!deletingRecord.value) return
  deleting.value = true
  try {
    await deleteRecord(deletingRecord.value._id)
    deleteOpen.value = false
    snackbar.success('Ausencia eliminada')
    await load()
  } catch {
    // Error visible en el VAlert.
  }
  deleting.value = false
}

const handleView = (record: IAbsenceView) =>
  navigateTo(`/admin/ausencias/${record._id}`)
</script>

<template>
  <div>
    <CommonPageHeader
      title="Ausencias y permisos"
      subtitle="Licencias, incapacidades y descansos compensatorios"
    >
      <template #actions>
        <v-btn
          v-if="canManage"
          color="primary"
          variant="tonal"
          prepend-icon="mdi-plus"
          @click="openNew"
        >
          Nueva ausencia
        </v-btn>
        <v-btn
          v-if="canManage"
          color="secondary"
          variant="tonal"
          prepend-icon="mdi-calendar-month-outline"
          to="/admin/ausencias/calendario"
        >
          Calendario
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
           
            style="max-width: 280px"
            @update:model-value="setFilter('employeeId', $event); options.page = 1; load()"
          />
          <v-select
            v-model="filters.type"
            :items="typeOptions"
            label="Tipo"
            clearable
           
            style="max-width: 210px"
            @update:model-value="setFilter('type', $event); options.page = 1; load()"
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
           
            style="max-width: 170px"
            @update:model-value="setFilter('status', $event); options.page = 1; load()"
          />
          <v-text-field
            v-model="filters.dateFrom"
            label="Desde"
            type="date"
           
            style="max-width: 160px"
            @update:model-value="setFilter('dateFrom', $event); options.page = 1; load()"
          />
          <v-text-field
            v-model="filters.dateTo"
            label="Hasta"
            type="date"
           
            style="max-width: 160px"
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

    
      <AbsenceTable
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
        @reject="openReject"
        @delete="confirmDelete"
      />

    <v-alert
      v-else
      type="warning"
      variant="tonal"
      text="No tienes permisos para gestionar ausencias."
    />

    <AbsenceFormDialog
      v-model="formOpen"
      :record="editingRecord"
      @saved="onFormSaved"
    />

    <v-dialog v-model="rejectOpen" max-width="480" persistent>
      <v-card>
        <v-card-title class="text-subtitle-1">Rechazar ausencia</v-card-title>
        <v-card-text>
          <v-textarea
            v-model="rejectReason"
            label="Motivo del rechazo"
            rows="3"
            auto-grow
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            color="grey-darken-1"
            @click="rejectOpen = false"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            :loading="savingAction"
            :disabled="savingAction || !rejectReason.trim()"
            @click="doReject"
          >
            Rechazar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteOpen" max-width="420" persistent>
      <v-card>
        <v-card-title class="text-subtitle-1">Eliminar ausencia</v-card-title>
        <v-card-text>
          ¿Seguro que quieres eliminar esta ausencia? Esta acción no se puede
          deshacer.
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
