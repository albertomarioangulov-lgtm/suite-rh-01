<script setup lang="ts">
import { ROLES, type UserRole } from '~~/shared/auth'
import { formatDate, formatTime } from '~~/shared/utils/datetime-helpers'

definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const recordId = computed(() => String(route.params.id))

const { user: authUser } = useAuthState()
const snackbar = useSnackbarState()
const {
  currentRecord,
  loading,
  error,
  fetchRecordById,
  updateRecord,
  deleteRecord,
  approveRecord,
  rejectRecord,
} = useAttendanceState()

const role = computed(() => authUser.value?.role)
const canManage = computed(
  () =>
    !!role.value &&
    ([ROLES.ADMIN, ROLES.MANAGER, ROLES.HR] as UserRole[]).includes(role.value),
)
const isAdmin = computed(() => role.value === ROLES.ADMIN)

const editOpen = ref(false)
const deleteOpen = ref(false)
const deleting = ref(false)

const load = async () => {
  try {
    await fetchRecordById(recordId.value)
  } catch {
    // Error visible en VAlert.
  }
}

watch(recordId, load, { immediate: true })

const employeeName = computed(() => {
  const employee = currentRecord.value?.employee
  if (typeof employee === 'object' && employee) {
    return `${employee.firstName} ${employee.lastName}`
  }
  return 'Empleado'
})

const onSaved = async (data: Record<string, unknown>) => {
  try {
    await updateRecord(recordId.value, data)
    editOpen.value = false
    snackbar.success('Registro actualizado')
    await load()
  } catch {
    // Error visible en VAlert.
  }
}

const setStatus = async (fn: (id: string) => Promise<unknown>, message: string) => {
  try {
    await fn(recordId.value)
    snackbar.success(message)
    await load()
  } catch {
    // Error visible en VAlert.
  }
}

const removeRecord = async () => {
  if (!currentRecord.value) return
  deleting.value = true
  try {
    await deleteRecord(currentRecord.value._id)
    snackbar.success('Registro eliminado')
    await navigateTo('/admin/attendance')
  } catch {
    // Error visible en VAlert.
  }
  deleting.value = false
}
</script>

<template>
  <div>
    <div class="d-flex align-center ga-2 mb-3">
      <v-btn
        icon="mdi-arrow-left"
        variant="text"
        @click="navigateTo('/admin/attendance')"
      />
      <h1 class="text-h6 font-weight-bold mt-0 mb-0">
        Registro de asistencia
      </h1>
    </div>

    <v-alert
      v-if="error"
      type="error"
      density="compact"
      variant="tonal"
      class="mb-4"
      :text="error"
      closable
      @click:close="error = ''"
    />

    <v-card v-if="currentRecord" max-width="640" class="mx-auto">
      <v-card-item>
        <template #prepend>
          <v-avatar color="primary" variant="tonal" size="48">
            <v-icon color="primary">mdi-clock-in</v-icon>
          </v-avatar>
        </template>
        <v-card-title class="text-h6 font-weight-bold">
          {{ employeeName }}
        </v-card-title>
        <v-card-subtitle>
          {{ formatDate(currentRecord.date, 'DD/MM/YYYY') }}
        </v-card-subtitle>
        <template #append>
          <AttendanceStatusBadge :status="currentRecord.status" />
        </template>
      </v-card-item>
      <v-divider />
      <v-list>
        <v-list-item
          title="Entrada"
          :subtitle="formatTime(currentRecord.clockIn)"
          prepend-icon="mdi-login"
        />
        <v-list-item
          title="Salida"
          :subtitle="formatTime(currentRecord.clockOut)"
          prepend-icon="mdi-logout"
        />
        <v-list-item
          title="Horas trabajadas"
          :subtitle="`${currentRecord.hoursWorked.toFixed(1)}h (${currentRecord.dayHours.toFixed(1)} diurnas / ${currentRecord.nightHours.toFixed(1)} nocturnas)`"
          prepend-icon="mdi-clock-outline"
        />
        <v-list-item
          title="Horas extras"
          :subtitle="`Diurnas ${currentRecord.overtimeDayHours.toFixed(1)}h · Nocturnas ${currentRecord.overtimeNightHours.toFixed(1)}h`"
          prepend-icon="mdi-clock-alert-outline"
        />
        <v-list-item
          title="Recargo nocturno (35%)"
          :subtitle="`${currentRecord.nightSurcharge.toFixed(2)}h`"
          prepend-icon="mdi-weather-night"
        />
        <v-list-item
          v-if="currentRecord.observations"
          title="Observaciones"
          :subtitle="currentRecord.observations"
          prepend-icon="mdi-comment-outline"
        />
      </v-list>

      <v-divider />
      <v-card-actions class="pa-4">
        <v-btn
          v-if="isAdmin"
          variant="text"
          color="error"
          prepend-icon="mdi-delete-outline"
          @click="deleteOpen = true"
        >
          Eliminar
        </v-btn>
        <v-spacer />
        <template v-if="canManage && currentRecord.status === 'pending'">
          <v-btn
            variant="tonal"
            color="error"
            prepend-icon="mdi-close"
            @click="setStatus(rejectRecord, 'Registro rechazado')"
          >
            Rechazar
          </v-btn>
          <v-btn
            variant="tonal"
            color="success"
            prepend-icon="mdi-check"
            @click="setStatus(approveRecord, 'Registro aprobado')"
          >
            Aprobar
          </v-btn>
          <v-btn
            variant="tonal"
            prepend-icon="mdi-pencil-outline"
            @click="editOpen = true"
          >
            Editar
          </v-btn>
        </template>
      </v-card-actions>
    </v-card>

    <v-card v-else-if="loading" max-width="640" class="mx-auto">
      <v-skeleton-loader type="list-item-two-line, divider, list-item-three-line" />
    </v-card>

    <AttendanceFormDialog
      v-model="editOpen"
      :record="currentRecord"
      @saved="onSaved"
    />

    <v-dialog v-model="deleteOpen" max-width="420" persistent>
      <v-card>
        <v-card-title class="text-subtitle-1">Eliminar registro</v-card-title>
        <v-card-text>
          ¿Seguro que quieres eliminar este registro? Esta acción no se puede
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
