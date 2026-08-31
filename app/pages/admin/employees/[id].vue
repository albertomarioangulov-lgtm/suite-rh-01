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

const { user: authUser, authFetch } = useAuthState()
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

watch(employeeId, () => {
  load()
  fetchEmploymentHistory()
}, { immediate: true })

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

// ---- Historial de vinculación y contratos ----
const employmentPeriods = ref<Array<Record<string, any>>>([])
const contracts = ref<Array<Record<string, any>>>([])
const contractDialogOpen = ref(false)
const contractSaving = ref(false)
const contractForm = reactive({
  employmentPeriodId: '',
  type: 'indefinite',
  startDate: '',
  endDate: '',
  salary: 0,
  position: '',
})

const fetchEmploymentHistory = async () => {
  try {
    const [periodsData, contractsData] = await Promise.all([
      authFetch<{ items: Array<Record<string, any>> }>(
        `/api/v1/employment-periods/${employeeId.value}`,
      ),
      authFetch<{ items: Array<Record<string, any>> }>(
        `/api/v1/contracts/${employeeId.value}/list`,
      ),
    ])
    employmentPeriods.value = periodsData.items
    contracts.value = contractsData.items
    if (!contractForm.employmentPeriodId && periodsData.items.length) {
      contractForm.employmentPeriodId = String(periodsData.items[0]._id)
    }
  } catch {
    // Error silencioso: la sección queda vacía.
  }
}

const rehireOpen = ref(false)
const rehireDate = ref('')
const rehiring = ref(false)

const doRehire = async () => {
  if (!rehireDate.value) return
  rehiring.value = true
  try {
    await authFetch(`/api/v1/employees/${employeeId.value}/rehire`, {
      method: 'POST',
      body: { hireDate: rehireDate.value },
    })
    rehireOpen.value = false
    snackbar.success('Empleado reingresado')
    await load()
    await fetchEmploymentHistory()
  } catch {
    snackbar.error('No se pudo registrar el reingreso')
  }
  rehiring.value = false
}

const saveContract = async () => {
  contractSaving.value = true
  try {
    await authFetch('/api/v1/contracts', {
      method: 'POST',
      body: {
        ...contractForm,
        salary: Number(contractForm.salary),
        endDate: contractForm.endDate || null,
        position: contractForm.position || undefined,
      },
    })
    contractDialogOpen.value = false
    snackbar.success('Contrato creado')
    await fetchEmploymentHistory()
  } catch {
    snackbar.error('No se pudo crear el contrato')
  }
  contractSaving.value = false
}

const contractTypeLabel = (type: string) =>
  ({ indefinite: 'Indefinido', fixed: 'Fijo', work_labor: 'Obra o labor', intern: 'Prácticas' })[type] ?? type

const periodStatusLabel = (status: string) =>
  status === 'active' ? 'Vigente' : 'Terminado'

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

    <!-- Historial de vinculación y contratos -->
    <v-card v-if="currentEmployee && canManage" class="mt-4">
      <v-card-item>
        <v-card-title class="text-subtitle-1 font-weight-bold">
          Vinculación y contratos
        </v-card-title>
        <template #append>
          <v-btn
            v-if="!currentEmployee.active"
            size="small"
            color="success"
            variant="tonal"
            prepend-icon="mdi-account-reactivate"
            @click="rehireOpen = true"
          >
            Reingresar
          </v-btn>
          <v-btn
            v-if="currentEmployee.active"
            size="small"
            color="primary"
            variant="tonal"
            prepend-icon="mdi-file-plus-outline"
            @click="contractDialogOpen = true"
          >
            Nuevo contrato
          </v-btn>
        </template>
      </v-card-item>
      <v-divider />

      <div class="pa-4">
        <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-2">
          Períodos de vinculación
        </div>
        <v-table v-if="employmentPeriods.length" density="compact">
          <thead>
            <tr>
              <th>Ingreso</th>
              <th>Salida</th>
              <th>Motivo</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="period in employmentPeriods" :key="period._id">
              <td class="text-body-2">{{ formatDate(period.hireDate, 'DD/MM/YYYY') }}</td>
              <td class="text-body-2">
                {{ period.terminationDate ? formatDate(period.terminationDate, 'DD/MM/YYYY') : '—' }}
              </td>
              <td class="text-body-2">{{ period.terminationReason ?? '—' }}</td>
              <td>
                <v-chip
                  size="x-small"
                  variant="tonal"
                  :color="period.status === 'active' ? 'success' : 'grey'"
                >
                  {{ periodStatusLabel(period.status) }}
                </v-chip>
              </td>
            </tr>
          </tbody>
        </v-table>
        <p v-else class="text-body-2 text-medium-emphasis">
          Sin períodos registrados. Se crean al dar de alta o reingresar al empleado.
        </p>

        <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-2 mt-4">
          Contratos
        </div>
        <v-table v-if="contracts.length" density="compact">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th>Salario</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="contract in contracts" :key="contract._id">
              <td class="text-body-2">{{ contractTypeLabel(contract.type) }}</td>
              <td class="text-body-2">{{ formatDate(contract.startDate, 'DD/MM/YYYY') }}</td>
              <td class="text-body-2">
                {{ contract.endDate ? formatDate(contract.endDate, 'DD/MM/YYYY') : '—' }}
              </td>
              <td class="text-body-2">{{ formatCOP(contract.salary) }}</td>
              <td>
                <v-chip size="x-small" variant="tonal" color="primary">
                  {{ contract.status }}
                </v-chip>
              </td>
            </tr>
          </tbody>
        </v-table>
        <p v-else class="text-body-2 text-medium-emphasis">
          Sin contratos registrados.
        </p>
      </div>
    </v-card>

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

    <v-dialog v-model="rehireOpen" max-width="420" persistent>
      <v-card>
        <v-card-title class="text-subtitle-1">Reingresar empleado</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="rehireDate"
            label="Fecha de ingreso"
            type="date"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" color="grey-darken-1" @click="rehireOpen = false">
            Cancelar
          </v-btn>
          <v-btn
            color="success"
            :loading="rehiring"
            :disabled="rehiring || !rehireDate"
            @click="doRehire"
          >
            Reingresar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="contractDialogOpen" max-width="560" persistent>
      <v-card>
        <v-card-title class="text-subtitle-1">Nuevo contrato</v-card-title>
        <v-card-text>
          <v-select
            v-model="contractForm.employmentPeriodId"
            :items="employmentPeriods.map((period) => ({
              title: `${formatDate(period.hireDate, 'DD/MM/YYYY')} → ${period.terminationDate ? formatDate(period.terminationDate, 'DD/MM/YYYY') : 'actualidad'}`,
              value: period._id,
            }))"
            label="Período de vinculación"
            class="mb-3"
          />
          <v-select
            v-model="contractForm.type"
            :items="[
              { title: 'Indefinido', value: 'indefinite' },
              { title: 'Fijo', value: 'fixed' },
              { title: 'Obra o labor', value: 'work_labor' },
              { title: 'Prácticas', value: 'intern' },
            ]"
            label="Tipo de contrato"
            class="mb-3"
          />
          <v-row>
            <v-col cols="6">
              <v-text-field v-model="contractForm.startDate" label="Inicio" type="date" class="mb-3" />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="contractForm.endDate" label="Fin (opcional)" type="date" class="mb-3" />
            </v-col>
          </v-row>
          <v-text-field v-model="contractForm.salary" label="Salario ($)" type="number" class="mb-3" />
          <v-text-field v-model="contractForm.position" label="Cargo" class="mb-3" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" color="grey-darken-1" @click="contractDialogOpen = false">
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            :loading="contractSaving"
            :disabled="contractSaving"
            @click="saveContract"
          >
            Crear contrato
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
