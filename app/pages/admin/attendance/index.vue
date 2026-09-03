<script setup lang="ts">
import { ROLES, type UserRole } from '~~/shared/auth'
import type { IAttendanceRecord } from '~/composables/states/useAttendanceState'
import { AttendanceTable } from '#components'
import { API_PATHS } from '~/utils/api-paths'
import { formatCOP } from '~/utils/number-helpers'
import { formatDate } from '~~/shared/utils/datetime-helpers'
import VChart from 'vue-echarts'
import dayjs from 'dayjs'
import { useDebounceFn } from '@vueuse/core'

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
    ([ROLES.ADMIN, ROLES.MANAGER, ROLES.HR, ROLES.SUPERADMIN] as UserRole[]).includes(role.value),
)
const canDelete = computed(() => role.value === ROLES.ADMIN || role.value === ROLES.SUPERADMIN)

const options = ref({ page: 1, itemsPerPage: 10 })
const employeeOptions = ref<Array<{ title: string; value: string }>>([])
const employeeNameById = new Map<string, string>()

const selectedEmployeeName = computed(() =>
  filters.value.employeeId
    ? employeeNameById.get(filters.value.employeeId) ?? ''
    : '',
)

const clearEmployeeFilter = () => setFilter('employeeId', undefined)

const pageSubtitle = computed(() =>
  filters.value.employeeId
    ? 'Registros filtrados por empleado'
    : 'Control de entrada/salida y cálculo de horas extras',
)

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
    lateCount: number
  }
  statusCounts: Record<string, number>
  daily: Array<{
    date: string
    records: number
    hoursWorked: number
    dayHours: number
    nightHours: number
    overtime: number
    overtimeDay: number
    overtimeNight: number
  }>
  topEmployees: Array<{
    employeeId: string
    name: string
    hoursWorked: number
    records: number
  }>
  lateToleranceMinutes: number
}

const dashboard = ref<IAttendanceDashboard | null>(null)
const dashboardLoading = ref(false)
const configOpen = ref(false)
const tolerance = ref(5)
const closedThrough = ref('')
const savingConfig = ref(false)
const search = ref('')
const activeTab = ref<'dashboard' | 'list'>('dashboard')
// Cache por combinación de filtros: volver a una vista ya consultada es instantáneo.
const dashboardCache = new Map<string, IAttendanceDashboard>()

const periodOptions = [
  { title: 'Hoy', value: 'today', icon: 'mdi-calendar-today' },
  { title: '7 días', value: '7d', icon: 'mdi-calendar-week' },
  { title: 'Este mes', value: 'month', icon: 'mdi-calendar-month' },
  { title: '30 días', value: '30d', icon: 'mdi-calendar-range' },
]

const presetRange = (preset: string) => {
  const now = dayjs()
  switch (preset) {
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
}

const activePreset = computed(() => {
  const { dateFrom, dateTo } = filters.value
  const match = periodOptions.find((option) => {
    const range = presetRange(option.value)
    return range.dateFrom === dateFrom && range.dateTo === dateTo
  })
  return match?.value ?? ''
})

const activePresetLabel = computed(
  () =>
    periodOptions.find((option) => option.value === activePreset.value)?.title ??
    'Período',
)

const applyPreset = (value: string) => {
  if (!value) {
    setFilter('dateFrom', undefined)
    setFilter('dateTo', undefined)
  } else {
    const range = presetRange(value)
    setFilter('dateFrom', range.dateFrom)
    setFilter('dateTo', range.dateTo)
  }
  reloadAll()
}

const onDateChange = (key: 'dateFrom' | 'dateTo', value: unknown) => {
  if (!value) {
    setFilter(key, undefined)
    return
  }
  const date = dayjs(value as Date | string)
  setFilter(key, date.isValid() ? date.format('YYYY-MM-DD') : undefined)
}

const dashboardParams = computed(() => ({
  employeeId: filters.value.employeeId || undefined,
  status: filters.value.status || undefined,
  dateFrom: filters.value.dateFrom || undefined,
  dateTo: filters.value.dateTo || undefined,
  search: search.value.trim() || undefined,
}))

const fetchDashboard = async () => {
  const params = dashboardParams.value
  const key = JSON.stringify(params)
  const cached = dashboardCache.get(key)
  if (cached) {
    dashboard.value = cached
    return
  }
  dashboardLoading.value = true
  try {
    const data = await authFetch<IAttendanceDashboard>(
      API_PATHS.attendance.dashboard,
      { query: params },
    )
    dashboard.value = data
    dashboardCache.set(key, data)
  } catch {
    // Silencioso: la tabla de asistencia sigue funcionando sin el dashboard.
  } finally {
    dashboardLoading.value = false
  }
}

const load = async () => {
  try {
    await fetchRecords({
      page: options.value.page,
      limit: options.value.itemsPerPage,
      employeeId: filters.value.employeeId || undefined,
      status: filters.value.status || undefined,
      dateFrom: filters.value.dateFrom || undefined,
      dateTo: filters.value.dateTo || undefined,
      search: search.value.trim() || undefined,
    })
  } catch {
    // Error visible en el VAlert.
  }
}

const reloadAll = () => {
  load()
  fetchDashboard()
}

const debouncedReload = useDebounceFn(reloadAll, 350)

watch(
  () => [
    filters.value.employeeId,
    filters.value.status,
    filters.value.dateFrom,
    filters.value.dateTo,
    search.value,
  ],
  () => {
    options.value.page = 1
    debouncedReload()
  },
)

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
    {
      title: 'Llegadas tarde',
      value: summary?.lateCount ?? 0,
      suffix: `vs. inicio de turno · tolerancia ${data?.lateToleranceMinutes ?? 5} min`,
      icon: 'mdi-clock-alert-outline',
      color: 'deep-orange',
    },
  ]
})

const closureOptions = computed(() => {
  const options: Array<{ title: string; value: string }> = [
    { title: 'Sin cierre', value: '' },
  ]
  const now = dayjs()
  for (let offset = 0; offset < 12; offset += 1) {
    const month = now.subtract(offset, 'month')
    options.push({
      title: month.format('MMMM YYYY'),
      value: month.format('YYYY-MM'),
    })
  }
  return options
})

const openConfig = async () => {
  try {
    const data = await authFetch<{
      lateToleranceMinutes: number
      attendanceClosedThrough: string
    }>(API_PATHS.attendance.config)
    tolerance.value = data.lateToleranceMinutes ?? 5
    closedThrough.value = data.attendanceClosedThrough ?? ''
  } catch {
    tolerance.value = dashboard.value?.lateToleranceMinutes ?? 5
    closedThrough.value = ''
  }
  configOpen.value = true
}

const saveConfig = async () => {
  savingConfig.value = true
  try {
    const data = await authFetch<{
      lateToleranceMinutes: number
      recomputed?: number
    }>(API_PATHS.attendance.config, {
      method: 'PUT',
      body: {
        lateToleranceMinutes: tolerance.value,
        attendanceClosedThrough: closedThrough.value,
      },
    })
    configOpen.value = false
    snackbar.success(
      data.recomputed
        ? `Tolerancia actualizada · ${data.recomputed} registro(s) no liquidados recalculados`
        : 'Tolerancia actualizada',
    )
    dashboardCache.clear()
    fetchDashboard()
    load()
  } catch {
    snackbar.error('No se pudo guardar la tolerancia.')
  } finally {
    savingConfig.value = false
  }
}

const statusDonutOptions = computed(() => {
  const counts = dashboard.value?.statusCounts ?? {}
  const entries = [
    { name: 'Aprobado', value: counts.approved ?? 0, color: '#4CAF50' },
    { name: 'Pendiente', value: counts.pending ?? 0, color: '#FB8C00' },
    { name: 'Rechazado', value: counts.rejected ?? 0, color: '#F44336' },
  ].filter((item) => item.value > 0)
  return {
    tooltip: { trigger: 'item' },
    legend: {
      top: 0,
      left: 'center',
      data: ['Diurnas', 'Nocturnas', 'Extras diurnas', 'Extras nocturnas'],
    },
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
  const showAverage = items.length > 1
  const averageOf = (pick: (item: (typeof items)[number]) => number) =>
    items.length ? items.reduce((sum, item) => sum + pick(item), 0) / items.length : 0
  const avgTotal = averageOf((item) => item.hoursWorked)
  const avgExtraDay = averageOf((item) => item.overtimeDay)
  const avgExtraNight = averageOf((item) => item.overtimeNight)
  const avgExtraTotal = averageOf((item) => item.overtime)
  // El promedio total de extras solo tiene sentido con ambos segmentos visibles.
  const showExtraTotalAvg =
    showAverage && extraDayVisible.value && extraNightVisible.value
  const avgMarkLine = (value: number, color: string) => ({
    symbol: 'none' as const,
    label: { fontSize: 10 },
    data: [
      {
        yAxis: value,
        lineStyle: { color, type: 'dashed' as const },
        label: { formatter: 'Prom. {c}h', color },
      },
    ],
  })
  return {
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value: number) => `${value}h`,
    },
    legend: { top: 0, left: 'center' },
    grid: { left: 24, right: 24, top: 56, bottom: 24 },
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
        name: 'Diurnas',
        type: 'bar' as const,
        stack: 'total',
        barMaxWidth: 28,
        data: items.map((item) => item.dayHours),
        itemStyle: { color: '#1867C0' },
        ...(showAverage ? { markLine: avgMarkLine(avgTotal, '#1867C0') } : {}),
      },
      {
        name: 'Nocturnas',
        type: 'bar' as const,
        stack: 'total',
        data: items.map((item) => item.nightHours),
        itemStyle: { color: '#48A9A6' },
      },
      {
        name: 'Extras diurnas',
        type: 'bar' as const,
        stack: 'total',
        data: items.map((item) => item.overtimeDay),
        itemStyle: { color: '#FB8C00' },
        ...(showAverage
          ? {
              markLine: {
                symbol: 'none' as const,
                label: { fontSize: 10 },
                data: [
                  {
                    yAxis: avgExtraDay,
                    lineStyle: { color: '#FB8C00', type: 'dashed' as const },
                    label: { formatter: 'Prom. {c}h', color: '#FB8C00' },
                  },
                  ...(showExtraTotalAvg
                    ? [
                        {
                          yAxis: avgExtraTotal,
                          lineStyle: {
                            color: '#EF6C00',
                            type: 'dashed' as const,
                          },
                          label: {
                            formatter: 'Prom. extras {c}h',
                            color: '#EF6C00',
                          },
                        },
                      ]
                    : []),
                ],
              },
            }
          : {}),
      },
      {
        name: 'Extras nocturnas',
        type: 'bar' as const,
        stack: 'total',
        data: items.map((item) => item.overtimeNight),
        itemStyle: { color: '#9C27B0' },
        ...(showAverage
          ? { markLine: avgMarkLine(avgExtraNight, '#9C27B0') }
          : {}),
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

// Estado de visibilidad de las series de extras (leyenda del gráfico).
const extraDayVisible = ref(true)
const extraNightVisible = ref(true)

const onLegendSelect = (payload: {
  name?: string
  selected?: Record<string, boolean>
}) => {
  if (!payload.selected) return
  extraDayVisible.value = payload.selected['Extras diurnas'] ?? true
  extraNightVisible.value = payload.selected['Extras nocturnas'] ?? true
}

onMounted(async () => {
  if (route.query.employeeId) {
    setFilter('employeeId', String(route.query.employeeId))
  }
  if (!filters.value.dateFrom && !filters.value.dateTo) {
    const range = presetRange('30d')
    setFilter('dateFrom', range.dateFrom)
    setFilter('dateTo', range.dateTo)
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
      for (const employee of data.items) {
        employeeNameById.set(
          employee._id,
          `${employee.firstName} ${employee.lastName}`.trim(),
        )
      }
    } catch {
      // Error silencioso.
    }
  }
})

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
      :subtitle="pageSubtitle"
    >
      <template #title>
        Asistencia
        <template v-if="selectedEmployeeName">
          de
          <span class="text-primary font-weight-bold">
            {{ selectedEmployeeName }}
          </span>
        </template>
      </template>
      <template #actions>
        <v-btn
          v-if="selectedEmployeeName"
          variant="text"
          color="primary"
          prepend-icon="mdi-filter-remove-outline"
          class="text-none"
          @click="clearEmployeeFilter"
        >
          Quitar filtro
        </v-btn>
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

    <!-- Controles compartidos (búsqueda y filtros) + pestañas -->
    <div v-if="canManage" class="mb-3">
      <CommonListToolbar
        v-model:search="search"
        search-placeholder="Buscar por nombre o documento…"
        :loading="loading"
      >
        <template #filters>
          <v-menu location="bottom start">
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                variant="solo"
                flat
                density="compact"
                bg-color="surface-light"
                class="text-none"
                prepend-icon="mdi-calendar-range"
                append-icon="mdi-chevron-down"
                style="max-width: 200px"
              >
                {{ activePresetLabel }}
              </v-btn>
            </template>
            <v-list density="compact">
              <v-list-item
                v-for="option in periodOptions"
                :key="option.value"
                :active="activePreset === option.value"
                color="primary"
                @click="applyPreset(option.value)"
              >
                <template #prepend>
                  <v-icon size="small">{{ option.icon }}</v-icon>
                </template>
                <v-list-item-title>{{ option.title }}</v-list-item-title>
                <template #append>
                  <v-icon
                    v-if="activePreset === option.value"
                    size="x-small"
                    color="primary"
                  >
                    mdi-check
                  </v-icon>
                </template>
              </v-list-item>
              <v-divider />
              <v-list-item disabled>
                <v-list-item-title class="text-caption text-medium-emphasis">
                  Fechas personalizadas: usa Desde / Hasta
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
          <v-autocomplete
            v-model="filters.employeeId"
            :items="employeeOptions"
            label="Empleado"
            item-title="title"
            item-value="value"
            clearable
            style="max-width: 220px"
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
            style="max-width: 150px"
          />
          <v-date-input
            :model-value="filters.dateFrom ? dayjs(filters.dateFrom).toDate() : null"
            label="Desde"
            input-format="YYYY-MM-DD"
            variant="solo"
            flat
            density="compact"
            hide-details
            clearable
            style="max-width: 200px"
            @update:model-value="onDateChange('dateFrom', $event)"
          />
          <v-date-input
            :model-value="filters.dateTo ? dayjs(filters.dateTo).toDate() : null"
            label="Hasta"
            input-format="YYYY-MM-DD"
            variant="solo"
            flat
            density="compact"
            hide-details
            clearable
            style="max-width: 200px"
            @update:model-value="onDateChange('dateTo', $event)"
          />
        </template>
        <template #actions>
          <v-btn
            icon="mdi-cog-outline"
            variant="text"
            title="Configuración de asistencia"
            @click="openConfig"
          />
        </template>
      </CommonListToolbar>

      <v-tabs v-model="activeTab" color="primary" class="mb-3">
        <v-tab value="dashboard" prepend-icon="mdi-view-dashboard-outline">
          Dashboard
        </v-tab>
        <v-tab value="list" prepend-icon="mdi-view-list-outline">Lista</v-tab>
      </v-tabs>

      <v-progress-linear
        v-if="dashboardLoading"
        indeterminate
        color="primary"
        height="4"
        class="mb-2"
      />

      <template v-if="activeTab === 'dashboard' && dashboard">
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
                <v-card-subtitle class="text-caption">
                  Barras apiladas: ordinarias y extras · líneas = promedio del período
                </v-card-subtitle>
              </v-card-item>
              <v-divider />
              <v-card-text>
                <VChart
                  :option="dailyOptions"
                  autoresize
                  @legendselectchanged="onLegendSelect"
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

      <AttendanceTable
        v-else-if="activeTab === 'list'"
        :items="records"
        :total="pagination.total"
        :loading="loading"
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
    <v-alert
      v-if="!canManage"
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

    <v-dialog v-model="configOpen" max-width="420">
      <v-card>
        <v-card-title class="text-subtitle-1 font-weight-bold">
          Configuración de asistencia
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model.number="tolerance"
            label="Tolerancia de llegada tarde (minutos)"
            type="number"
            min="0"
            max="120"
            variant="outlined"
            density="compact"
            hint="Se considera tarde cuando la entrada supera el inicio del turno en más de esta tolerancia. Solo afecta períodos abiertos."
            persistent-hint
          />
          <v-select
            v-model="closedThrough"
            :items="closureOptions"
            label="Cierre de asistencia"
            variant="outlined"
            density="compact"
            class="mt-4"
            hint="Las asistencias de ese mes o anteriores quedan congeladas (aplica aunque el cliente no tenga nómina)."
            persistent-hint
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="configOpen = false">Cancelar</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="savingConfig"
            :disabled="savingConfig"
            @click="saveConfig"
          >
            Guardar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
