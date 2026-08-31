<script setup lang="ts">
import { ROLES, type UserRole } from '~~/shared/auth'
import type { IAttendanceRecord } from '~/composables/states/useAttendanceState'
import { AttendanceTable } from '#components'
import { API_PATHS } from '~/utils/api-paths'
import { formatCOP } from '~/utils/number-helpers'
import { formatDate } from '~~/shared/utils/datetime-helpers'
import VChart from 'vue-echarts'
import dayjs from 'dayjs'

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

// ---- Dashboard de asistencia ----

interface IAttendanceDashboard {
  summary: {
    records: number
    employees: number
    hoursWorked: number
    dayHours: number
    nightHours: number
    overtime: number
    overtimeDay: number
    overtimeNight: number
    nightSurcharge: number
  }
  statusCounts: Record<string, number>
  daily: Array<{
    date: string
    records: number
    hoursWorked: number
    overtime: number
  }>
  topEmployees: Array<{
    employeeId: string
    name: string
    hoursWorked: number
    records: number
  }>
}

const dashboard = ref<IAttendanceDashboard | null>(null)
const dashboardLoading = ref(false)
const period = ref<'today' | '7d' | 'month' | '30d'>('30d')
// Cache por período: volver a un rango ya consultado es instantáneo.
const dashboardCache = new Map<string, IAttendanceDashboard>()

const periodOptions = [
  { title: 'Hoy', value: 'today' },
  { title: '7 días', value: '7d' },
  { title: 'Este mes', value: 'month' },
  { title: '30 días', value: '30d' },
]

const periodRange = computed(() => {
  const now = dayjs()
  switch (period.value) {
    case 'today':
      return {
        dateFrom: now.format('YYYY-MM-DD'),
        dateTo: now.format('YYYY-MM-DD'),
      }
    case '7d':
      return {
        dateFrom: now.subtract(6, 'day').format('YYYY-MM-DD'),
        dateTo: now.format('YYYY-MM-DD'),
      }
    case 'month':
      return {
        dateFrom: now.startOf('month').format('YYYY-MM-DD'),
        dateTo: now.format('YYYY-MM-DD'),
      }
    default:
      return {
        dateFrom: now.subtract(29, 'day').format('YYYY-MM-DD'),
        dateTo: now.format('YYYY-MM-DD'),
      }
  }
})

const fetchDashboard = async () => {
  const key = `${period.value}:${periodRange.value.dateFrom}:${periodRange.value.dateTo}`
  const cached = dashboardCache.get(key)
  if (cached) {
    dashboard.value = cached
    return
  }
  dashboardLoading.value = true
  try {
    const data = await authFetch<IAttendanceDashboard>(
      API_PATHS.attendance.dashboard,
      { query: periodRange.value },
    )
    dashboard.value = data
    dashboardCache.set(key, data)
  } catch {
    // Silencioso: la tabla de asistencia sigue funcionando sin el dashboard.
  } finally {
    dashboardLoading.value = false
  }
}

watch(period, fetchDashboard)

const dashboardKpis = computed(() => {
  const data = dashboard.value
  const summary = data?.summary
  const pending = data?.statusCounts.pending ?? 0
  return [
    {
      title: 'Registros',
      value: summary?.records ?? 0,
      suffix: `${summary?.employees ?? 0} empleado(s) con registro`,
      icon: 'mdi-calendar-check-outline',
      color: 'primary',
    },
    {
      title: 'Horas trabajadas',
      value: summary ? `${summary.hoursWorked.toFixed(1)}h` : '0h',
      suffix: `${summary?.dayHours.toFixed(1) ?? '0'}h diurnas · ${summary?.nightHours.toFixed(1) ?? '0'}h nocturnas`,
      icon: 'mdi-clock-in',
      color: 'success',
    },
    {
      title: 'Horas extra',
      value: summary ? `${summary.overtime.toFixed(1)}h` : '0h',
      suffix: 'Recargo nocturno incluido en la composición',
      icon: 'mdi-clock-alert-outline',
      color: 'warning',
    },
    {
      title: 'Pendientes de aprobación',
      value: pending,
      suffix: data
        ? `${data.statusCounts.approved ?? 0} aprobados · ${data.statusCounts.rejected ?? 0} rechazados`
        : '',
      icon: 'mdi-clock-pending-outline',
      color: 'error',
    },
  ]
})

const statusDonutOptions = computed(() => {
  const counts = dashboard.value?.statusCounts ?? {}
  const entries = [
    { name: 'Aprobado', value: counts.approved ?? 0, color: '#4CAF50' },
    { name: 'Pendiente', value: counts.pending ?? 0, color: '#FB8C00' },
    { name: 'Rechazado', value: counts.rejected ?? 0, color: '#F44336' },
  ].filter((item) => item.value > 0)
  return {
    tooltip: { trigger: 'item' },
    legend: { top: 0, left: 'center' },
    series: [
      {
        name: 'Registros por estado',
        type: 'pie' as const,
        radius: ['42%', '68%'],
        center: ['50%', '55%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        data: entries.map((item) => ({
          name: item.name,
          value: item.value,
          itemStyle: { color: item.color },
        })),
      },
    ],
  }
})

const hoursCompositionOptions = computed(() => {
  const summary = dashboard.value?.summary
  if (!summary) return { series: [{ type: 'pie', data: [] }] }
  const entries = [
    { name: 'Diurnas', value: summary.dayHours, color: '#1867C0' },
    { name: 'Nocturnas', value: summary.nightHours, color: '#48A9A6' },
    { name: 'Extras diurnas', value: summary.overtimeDay, color: '#FB8C00' },
    { name: 'Extras nocturnas', value: summary.overtimeNight, color: '#9C27B0' },
  ]
  return {
    tooltip: { trigger: 'item' },
    legend: { top: 0, left: 'center' },
    series: [
      {
        name: 'Composición de horas',
        type: 'pie' as const,
        radius: ['42%', '68%'],
        center: ['50%', '55%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        data: entries.map((item) => ({
          name: item.name,
          value: item.value,
          itemStyle: { color: item.color },
        })),
      },
    ],
  }
})

const dailyOptions = computed(() => {
  const items = dashboard.value?.daily ?? []
  return {
    tooltip: { trigger: 'axis' },
    legend: { top: 0, left: 'center' },
    grid: { left: 24, right: 24, top: 48, bottom: 24 },
    xAxis: {
      type: 'category' as const,
      data: items.map((item) => formatDate(item.date, 'DD/MM')),
      axisLabel: {
        interval: 0,
        rotate: items.length > 12 ? 45 : 0,
        fontSize: 10,
      },
    },
    yAxis: {
      type: 'value' as const,
      axisLabel: { formatter: (value: number) => `${value}h` },
    },
    series: [
      {
        name: 'Horas trabajadas',
        type: 'bar' as const,
        barMaxWidth: 28,
        data: items.map((item) => item.hoursWorked),
        itemStyle: { color: '#1867C0', borderRadius: [4, 4, 0, 0] },
      },
      {
        name: 'Horas extra',
        type: 'line' as const,
        smooth: true,
        data: items.map((item) => item.overtime),
        itemStyle: { color: '#FB8C00' },
      },
    ],
  }
})

const topEmployeesOptions = computed(() => {
  const items = [...(dashboard.value?.topEmployees ?? [])].slice(0, 8)
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (value: number) => `${value}h`,
    },
    grid: { left: 110, right: 24, top: 8, bottom: 24 },
    xAxis: {
      type: 'value' as const,
      axisLabel: { formatter: (value: number) => `${value}h` },
    },
    yAxis: {
      type: 'category' as const,
      data: items.map((item) => item.name).reverse(),
      axisLabel: { width: 120, overflow: 'truncate', fontSize: 11 },
    },
    series: [
      {
        name: 'Horas trabajadas',
        type: 'bar' as const,
        barMaxWidth: 18,
        data: items.map((item) => item.hoursWorked).reverse(),
        itemStyle: { color: '#48A9A6', borderRadius: [0, 6, 6, 0] },
      },
    ],
  }
})

onMounted(async () => {
  if (route.query.employeeId) {
    setFilter('employeeId', String(route.query.employeeId))
  }
  load()
  fetchDashboard()
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

    <!-- Dashboard de asistencia -->
    <div v-if="canManage" class="mb-4">
      <div class="d-flex align-center flex-wrap ga-2 mb-3">
        <span class="text-subtitle-1 font-weight-bold">
          Dashboard de asistencia
        </span>
        <v-spacer />
        <v-btn-toggle
          v-model="period"
          density="compact"
          color="primary"
          variant="tonal"
          divided
        >
          <v-btn
            v-for="option in periodOptions"
            :key="option.value"
            :value="option.value"
            size="small"
          >
            {{ option.title }}
          </v-btn>
        </v-btn-toggle>
      </div>

      <v-progress-linear
        v-if="dashboardLoading"
        indeterminate
        color="primary"
        height="4"
        class="mb-2"
      />

      <template v-if="dashboard">
        <v-row density="compact" class="mb-4">
          <v-col
            v-for="kpi in dashboardKpis"
            :key="kpi.title"
            cols="12"
            sm="6"
            lg="3"
          >
            <v-card class="h-100">
              <v-card-text>
                <div class="d-flex align-center ga-2 mb-2">
                  <v-avatar :color="kpi.color" variant="tonal" size="36">
                    <v-icon size="small" :color="kpi.color">{{ kpi.icon }}</v-icon>
                  </v-avatar>
                  <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
                    {{ kpi.title }}
                  </span>
                </div>
                <div class="text-h6 font-weight-bold">{{ kpi.value }}</div>
                <div class="text-caption text-medium-emphasis">{{ kpi.suffix }}</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-row density="compact">
          <v-col cols="12" lg="8">
            <v-card class="h-100">
              <v-card-item>
                <v-card-title class="text-subtitle-1 font-weight-bold">
                  Horas por día
                </v-card-title>
              </v-card-item>
              <v-divider />
              <v-card-text>
                <VChart
                  :option="dailyOptions"
                  autoresize
                  style="height: 280px; width: 100%"
                />
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="6" lg="4">
            <v-card class="h-100">
              <v-card-item>
                <v-card-title class="text-subtitle-1 font-weight-bold">
                  Registros por estado
                </v-card-title>
              </v-card-item>
              <v-divider />
              <v-card-text>
                <VChart
                  :option="statusDonutOptions"
                  autoresize
                  style="height: 280px; width: 100%"
                />
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="6" lg="4">
            <v-card class="h-100">
              <v-card-item>
                <v-card-title class="text-subtitle-1 font-weight-bold">
                  Composición de horas
                </v-card-title>
              </v-card-item>
              <v-divider />
              <v-card-text>
                <VChart
                  :option="hoursCompositionOptions"
                  autoresize
                  style="height: 280px; width: 100%"
                />
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" lg="8">
            <v-card class="h-100">
              <v-card-item>
                <v-card-title class="text-subtitle-1 font-weight-bold">
                  Top empleados por horas trabajadas
                </v-card-title>
              </v-card-item>
              <v-divider />
              <v-card-text>
                <VChart
                  :option="topEmployeesOptions"
                  autoresize
                  style="height: 280px; width: 100%"
                />
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </template>
    </div>

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
