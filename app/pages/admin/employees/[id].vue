<script setup lang="ts">
import { ROLES, type UserRole } from '~~/shared/auth'
import { CONTRACT_TYPE_LABELS } from '~/utils/contract-types'
import { formatCOP } from '~/utils/number-helpers'
import { formatDate, formatTime } from '~~/shared/utils/datetime-helpers'
import type {
  IEmployeePayload,
} from '~/composables/states/useEmployeeState'
import { absenceTypeLabel } from '~/composables/states/useAbsenceState'

definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const employeeId = computed(() => String(route.params.id))

const { user: authUser } = useAuthState()
const snackbar = useSnackbarState()
const {
  currentEmployee,
  loading,
  error,
  fetchEmployeeById,
  updateEmployee,
  deleteEmployee,
} = useEmployeeState()

const isAdmin = computed(() => authUser.value?.role === ROLES.ADMIN)
const editOpen = ref(false)
const deleteOpen = ref(false)
const deleting = ref(false)

const canManage = computed(
  () =>
    !!authUser.value?.role &&
    ([ROLES.ADMIN, ROLES.MANAGER, ROLES.HR] as UserRole[]).includes(
      authUser.value.role,
    ),
)

const {
  records: attendanceRecords,
  fetchRecords: fetchAttendanceRecords,
} = useAttendanceState()

const {
  records: absenceRecords,
  fetchRecords: fetchAbsenceRecords,
  createRecord: createAbsenceRecord,
  approveRecord: approveAbsenceRecord,
  rejectRecord: rejectAbsenceRecord,
} = useAbsenceState()

const absenceFormOpen = ref(false)
const rejectOpen = ref(false)
const rejectingAbsence = ref<{ _id: string; type: string } | null>(null)
const rejectReason = ref('')
const absenceSaving = ref(false)

const load = async () => {
  try {
    await fetchEmployeeById(employeeId.value)
    if (canManage.value) {
      await fetchAttendanceRecords({
        employeeId: employeeId.value,
        limit: 8,
        page: 1,
      })
      await fetchAbsenceRecords({
        employeeId: employeeId.value,
        limit: 5,
        page: 1,
      })
    }
  } catch {
    // Error visible en VAlert.
  }
}

watch(employeeId, load, { immediate: true })

const fullName = computed(() =>
  currentEmployee.value
    ? `${currentEmployee.value.firstName} ${currentEmployee.value.lastName}`
    : '',
)

const initials = computed(() =>
  currentEmployee.value
    ? `${currentEmployee.value.firstName[0] ?? ''}${currentEmployee.value.lastName[0] ?? ''}`.toUpperCase()
    : '?',
)

const contractLabel = computed(() =>
  currentEmployee.value
    ? CONTRACT_TYPE_LABELS[currentEmployee.value.contractType] ??
      currentEmployee.value.contractType
    : '',
)

const hireDateLabel = computed(() =>
  currentEmployee.value?.hireDate
    ? formatDate(currentEmployee.value.hireDate, 'DD/MM/YYYY')
    : '—',
)

const seniorityLabel = computed(() => {
  const hireDate = currentEmployee.value?.hireDate
  if (!hireDate) return '—'
  const months = Math.max(
    0,
    Math.floor(
      (Date.now() - new Date(hireDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44),
    ),
  )
  const years = Math.floor(months / 12)
  const rest = months % 12
  return years > 0
    ? `${years} año(s) ${rest} mes(es)`
    : `${months} mes(es)`
})

const onSaved = async (data: Record<string, unknown>) => {
  try {
    await updateEmployee(employeeId.value, data as IEmployeePayload)
    editOpen.value = false
    snackbar.success('Empleado actualizado correctamente')
    await load()
  } catch {
    // Error visible en VAlert.
  }
}

const removeEmployee = async () => {
  if (!currentEmployee.value) return
  deleting.value = true
  try {
    await deleteEmployee(currentEmployee.value._id, terminationReason.value || undefined)
    snackbar.success('Empleado dado de baja')
    await navigateTo('/admin/employees')
  } catch {
    // Error visible en VAlert.
  }
  deleting.value = false
}

const terminationReason = ref('')

const terminationOptions = [
  { title: 'Retiro voluntario', value: 'retiro_voluntario' },
  { title: 'Despido', value: 'despido' },
  { title: 'Contrato vencido', value: 'contrato_vencido' },
  { title: 'Pensión', value: 'pension' },
  { title: 'Otro', value: 'otro' },
]

const onAbsenceSaved = async (data: Record<string, unknown>) => {
  absenceSaving.value = true
  try {
    await createAbsenceRecord(data)
    absenceFormOpen.value = false
    snackbar.success('Ausencia registrada')
    await load()
  } catch {
    // Error visible en VAlert.
  }
  absenceSaving.value = false
}

const approveAbsence = async (absence: { _id: string }) => {
  absenceSaving.value = true
  try {
    await approveAbsenceRecord(absence._id)
    snackbar.success('Ausencia aprobada')
    await load()
  } catch {
    // Error visible en VAlert.
  }
  absenceSaving.value = false
}

const openReject = (absence: { _id: string; type: string }) => {
  rejectingAbsence.value = absence
  rejectReason.value = ''
  rejectOpen.value = true
}

const doReject = async () => {
  if (!rejectingAbsence.value || !rejectReason.value.trim()) return
  absenceSaving.value = true
  try {
    await rejectAbsenceRecord(rejectingAbsence.value._id, rejectReason.value.trim())
    rejectOpen.value = false
    snackbar.success('Ausencia rechazada')
    await load()
  } catch {
    // Error visible en VAlert.
  }
  absenceSaving.value = false
}
</script>

<template>
  <div>
    <CommonPageHeader
      :title="fullName || 'Detalle de empleado'"
      :subtitle="currentEmployee?.position || 'Cargando…'"
    >
      <template #actions>
        <v-btn
          variant="text"
          color="grey-darken-1"
          prepend-icon="mdi-arrow-left"
          to="/admin/employees"
        >
          Empleados
        </v-btn>
        <v-btn
          v-if="currentEmployee"
          variant="tonal"
          color="primary"
          prepend-icon="mdi-pencil-outline"
          @click="editOpen = true"
        >
          Editar
        </v-btn>
        <v-btn
          v-if="isAdmin"
          variant="text"
          color="error"
          prepend-icon="mdi-delete-outline"
          @click="deleteOpen = true"
        >
          Eliminar
        </v-btn>
      </template>
    </CommonPageHeader>

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

    <!-- Cabecera de perfil -->
    <v-card v-if="currentEmployee" class="mb-4 overflow-hidden">
      <div class="d-flex align-center ga-4 pa-6 flex-wrap">
        <v-avatar color="primary" variant="tonal" size="72">
          <span class="text-h5 font-weight-bold text-primary">{{ initials }}</span>
        </v-avatar>
        <div class="flex-grow-1" style="min-width: 240px">
          <div class="d-flex align-center ga-2 flex-wrap">
            <h2 class="text-h6 font-weight-bold mb-0">{{ fullName }}</h2>
            <v-chip
              size="small"
              variant="tonal"
              :color="currentEmployee.active ? 'success' : 'error'"
            >
              {{ currentEmployee.active ? 'Activo' : 'Inactivo' }}
            </v-chip>
            <v-chip size="small" variant="tonal" color="secondary">
              {{ contractLabel }}
            </v-chip>
          </div>
          <div class="text-body-2 text-medium-emphasis mt-1">
            {{ currentEmployee.document }} · Ingreso
            {{ hireDateLabel }} · Antigüedad {{ seniorityLabel }}
          </div>
        </div>
        <div v-if="canManage" class="d-flex ga-2 flex-wrap">
          <v-btn
            variant="tonal"
            prepend-icon="mdi-clock-in-outline"
            :to="`/admin/attendance?employeeId=${currentEmployee._id}`"
          >
            Asistencia
          </v-btn>
          <v-btn
            variant="tonal"
            prepend-icon="mdi-calendar-edit-outline"
            :to="`/admin/ausencias?employeeId=${currentEmployee._id}`"
          >
            Ausencias
          </v-btn>
        </div>
      </div>
    </v-card>

    <v-skeleton-loader
      v-else-if="loading"
      type="article, list-item-two-line, table"
      class="mb-4"
    />

    <!-- Datos del empleado -->
    <v-row v-if="currentEmployee" density="compact" class="mb-4">
      <v-col cols="12" md="6" lg="3">
        <v-card class="h-100">
          <v-card-text>
            <div class="d-flex align-center ga-2 mb-2">
              <v-icon color="primary" size="small">mdi-badge-account-outline</v-icon>
              <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
                Identificación
              </span>
            </div>
            <div class="text-subtitle-1 font-weight-medium">
              {{ currentEmployee.document }}
            </div>
            <div class="text-caption text-medium-emphasis">{{ contractLabel }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6" lg="3">
        <v-card class="h-100">
          <v-card-text>
            <div class="d-flex align-center ga-2 mb-2">
              <v-icon color="primary" size="small">mdi-email-outline</v-icon>
              <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
                Contacto
              </span>
            </div>
            <div class="text-subtitle-1 font-weight-medium text-truncate">
              {{ currentEmployee.email || 'Sin correo' }}
            </div>
            <div class="text-caption text-medium-emphasis">Correo institucional</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6" lg="3">
        <v-card class="h-100">
          <v-card-text>
            <div class="d-flex align-center ga-2 mb-2">
              <v-icon color="primary" size="small">mdi-currency-usd</v-icon>
              <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
                Salario base
              </span>
            </div>
            <div class="text-subtitle-1 font-weight-medium">
              {{ formatCOP(currentEmployee.baseSalary) }}
            </div>
            <div class="text-caption text-medium-emphasis">Mensual</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6" lg="3">
        <v-card class="h-100">
          <v-card-text>
            <div class="d-flex align-center ga-2 mb-2">
              <v-icon color="primary" size="small">mdi-clock-outline</v-icon>
              <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
                Turno asignado
              </span>
            </div>
            <div class="text-subtitle-1 font-weight-medium text-truncate">
              {{ currentEmployee.assignedShift || 'Sin turno' }}
            </div>
            <div class="text-caption text-medium-emphasis">Según horario</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Historial: asistencia y ausencias -->
    <v-row density="compact">
      <v-col cols="12" lg="7">
        <v-card v-if="canManage" class="h-100">
          <v-card-item>
            <v-card-title class="text-subtitle-1 font-weight-bold">
              Asistencia reciente
            </v-card-title>
            <template #append>
              <v-btn
                size="small"
                variant="tonal"
                prepend-icon="mdi-chart-timeline-variant"
                :to="`/admin/attendance/weekly-summary?employeeId=${currentEmployee?._id}`"
              >
                Resumen semanal
              </v-btn>
            </template>
          </v-card-item>
          <v-divider />
          <v-table v-if="attendanceRecords.length" density="compact">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Entrada</th>
                <th>Salida</th>
                <th class="text-end">Horas</th>
                <th class="text-end">Extras D/N</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in attendanceRecords" :key="record._id">
                <td class="text-body-2">{{ formatDate(record.date, 'DD/MM/YYYY') }}</td>
                <td class="text-body-2">{{ formatTime(record.clockIn) }}</td>
                <td class="text-body-2">{{ formatTime(record.clockOut) }}</td>
                <td class="text-body-2 text-end">{{ record.hoursWorked.toFixed(1) }}h</td>
                <td class="text-body-2 text-end">
                  {{ record.overtimeDayHours.toFixed(1) }} / {{ record.overtimeNightHours.toFixed(1) }}
                </td>
                <td>
                  <AttendanceStatusBadge :status="record.status" />
                </td>
              </tr>
            </tbody>
          </v-table>
          <v-card-text v-else class="text-medium-emphasis">
            Sin registros de asistencia para este empleado.
          </v-card-text>
          <v-card-actions v-if="attendanceRecords.length" class="justify-end pt-0">
            <v-btn
              size="small"
              variant="text"
              :to="`/admin/attendance?employeeId=${currentEmployee?._id}`"
            >
              Ver toda la asistencia
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <v-col cols="12" lg="5">
        <v-card v-if="canManage" class="h-100">
          <v-card-item>
            <v-card-title class="text-subtitle-1 font-weight-bold">
              Ausencias recientes
            </v-card-title>
            <template #append>
              <v-btn
                size="small"
                color="primary"
                variant="tonal"
                prepend-icon="mdi-plus"
                @click="absenceFormOpen = true"
              >
                Nueva
              </v-btn>
            </template>
          </v-card-item>
          <v-divider />
          <v-table v-if="absenceRecords.length" density="compact">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Inicio</th>
                <th>Días</th>
                <th>Estado</th>
                <th class="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="absence in absenceRecords" :key="absence._id">
                <td class="text-body-2">{{ absenceTypeLabel(absence.type) }}</td>
                <td class="text-body-2">{{ formatDate(absence.startDate, 'DD/MM/YYYY') }}</td>
                <td class="text-body-2">{{ absence.days }}</td>
                <td>
                  <AbsenceStatusBadge :status="absence.status" />
                </td>
                <td class="text-end">
                  <template v-if="absence.status === 'pending'">
                    <v-btn
                      icon
                      size="x-small"
                      color="success"
                      title="Aprobar"
                      :loading="absenceSaving"
                      @click="approveAbsence(absence)"
                    >
                      <v-icon>mdi-check</v-icon>
                    </v-btn>
                    <v-btn
                      icon
                      size="x-small"
                      color="error"
                      title="Rechazar"
                      :loading="absenceSaving"
                      @click="openReject(absence)"
                    >
                      <v-icon>mdi-close</v-icon>
                    </v-btn>
                  </template>
                  <v-btn
                    v-else
                    icon
                    size="x-small"
                    variant="text"
                    title="Ver detalle"
                    :to="`/admin/ausencias/${absence._id}`"
                  >
                    <v-icon>mdi-eye-outline</v-icon>
                  </v-btn>
                </td>
              </tr>
            </tbody>
          </v-table>
          <v-card-text v-else class="text-medium-emphasis">
            Sin ausencias registradas para este empleado.
          </v-card-text>
          <v-card-actions v-if="absenceRecords.length" class="justify-end pt-0">
            <v-btn
              size="small"
              variant="text"
              :to="`/admin/ausencias?employeeId=${currentEmployee?._id}`"
            >
              Ver todas
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <AbsenceFormDialog
      v-model="absenceFormOpen"
      :initial-employee-id="employeeId"
      @saved="onAbsenceSaved"
    />

    <EmployeesFormDialog
      v-model="editOpen"
      :employee="currentEmployee"
      @saved="onSaved"
    />

    <v-dialog v-model="rejectOpen" max-width="440" persistent>
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
            :loading="absenceSaving"
            :disabled="absenceSaving || !rejectReason.trim()"
            @click="doReject"
          >
            Rechazar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteOpen" max-width="460" persistent>
      <v-card>
        <v-card-title class="text-subtitle-1">Dar de baja a empleado</v-card-title>
        <v-card-text>
          Se registrará la baja de <strong>{{ fullName }}</strong> con la fecha
          de hoy. El historial (nómina y ausencias) se conserva.
          <v-select
            v-model="terminationReason"
            :items="terminationOptions"
            label="Motivo de la baja"
            class="mt-3"
          />
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
            Dar de baja
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
