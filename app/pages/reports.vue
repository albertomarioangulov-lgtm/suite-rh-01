<script setup lang="ts">
import { ROLES, type UserRole } from '~~/shared/auth'
import { ABSENCE_TYPE_LABELS } from '~~/shared/absence'
import { formatCOP } from '~/utils/number-helpers'
import { exportToCsv } from '~/utils/export-helpers'
import VChart from 'vue-echarts'
import dayjs from 'dayjs'

definePageMeta({
  layout: 'default',
  middleware: 'auth',
})

const { user } = useAuthState()
const { overview, loading, error, fetchOverview } = useAnalyticsState()
useModuleGuard()

const canView = computed(() => {
  const role = user.value?.role as UserRole | undefined
  return (
    !!role && ([ROLES.ADMIN, ROLES.MANAGER, ROLES.HR] as UserRole[]).includes(role)
  )
})

const period = ref({
  month: dayjs().month() + 1,
  year: dayjs().year(),
})

const load = async () => {
  if (!canView.value) return
  try {
    await fetchOverview(period.value.month, period.value.year)
  } catch {
    // Error visible en el VAlert.
  }
}

onMounted(load)

const setPeriod = (month: number, year: number) => {
  period.value = { month, year }
  load()
}

const setThisMonth = () => setPeriod(dayjs().month() + 1, dayjs().year())
const setPreviousMonth = () =>
  setPeriod(
    dayjs().subtract(1, 'month').month() + 1,
    dayjs().subtract(1, 'month').year(),
  )

const monthLabel = computed(() =>
  dayjs(new Date(period.value.year, period.value.month - 1, 1)).format('MMMM YYYY'),
)

// ---- KPIs con variación ----

const kpis = computed(() => {
  const data = overview.value
  const attendance = data?.attendance
  const totalHours =
    (attendance?.hoursWorked ?? 0) +
    (attendance?.overtimeDayHours ?? 0) +
    (attendance?.overtimeNightHours ?? 0)
  return [
    {
      title: 'Colaboradores activos',
      value: data?.headcount?.activeEmployees ?? 0,
      suffix: `de ${data?.headcount?.totalEmployees ?? 0} registrados`,
      icon: 'mdi-account-group-outline',
      color: 'primary',
    },
    {
      title: 'Nómina neta del mes',
      value:
        data?.payroll?.totalToPay
          ? formatCOP(data.payroll.totalToPay)
          : data?.draftPayrolls.length
            ? 'En borrador'
            : '$0',
      delta: data?.payroll?.netVariation,
      suffix: data?.payroll?.employeeCount
        ? `${data.payroll.employeeCount} empleado(s) · prom. ${formatCOP(data.payroll.averageNet)}`
        : data?.draftPayrolls.length
          ? `${formatCOP(data.draftPayrolls.reduce((sum, item) => sum + item.totalToPay, 0))} sin aprobar`
          : 'Sin nómina aprobada en el período',
      icon: 'mdi-cash-multiple',
      color: 'success',
    },
    {
      title: 'Tasa de ausentismo',
      value: data?.absences ? `${data.absences.rate.toFixed(2)}%` : '0.00%',
      suffix: `${data?.absences?.totalDays ?? 0} día(s) de ausencia aprobada`,
      icon: 'mdi-calendar-remove-outline',
      color: 'warning',
    },
    {
      title: 'Rotación (12 meses)',
      value: `${(data?.headcount?.rotationRate ?? 0).toFixed(1)}%`,
      suffix: `${data?.headcount?.terminations ?? 0} baja(s) · prom. ${data?.headcount?.activeEmployees ?? 0} activos`,
      icon: 'mdi-account-switch-outline',
      color: 'purple',
    },
    {
      title: 'Horas del mes',
      value: `${totalHours.toFixed(1)}h`,
      suffix: `${attendance?.days ?? 0} registros de asistencia`,
      icon: 'mdi-clock-in-outline',
      color: 'info',
    },
    {
      title: 'Alertas activas',
      value: data?.alerts?.active ?? 0,
      suffix: 'sin resolver (horas extras, permisos)',
      icon: 'mdi-bell-alert-outline',
      color: 'error',
    },
  ]
})

const kpiTargets: Record<string, string> = {
  'Colaboradores activos': '/admin/employees',
  'Nómina neta del mes': '/admin/payroll',
  'Tasa de ausentismo': '/admin/ausencias',
  'Rotación (12 meses)': '/admin/employees',
  'Horas del mes': '/admin/attendance',
  'Alertas activas': '/admin/attendance',
}

// ---- Opciones de gráficos ----

const emptyChartOption = {
  tooltip: { trigger: 'axis' },
  grid: { left: 24, right: 24, top: 56, bottom: 16 },
  xAxis: { type: 'category', data: [] },
  yAxis: { type: 'value' },
  series: [{ type: 'bar', data: [] }],
}

const payrollChartOptions = computed(() => {
  const series = overview.value?.monthlySeries ?? []
  const hasDrafts = series.some((item) => (item.draftTotalToPay ?? 0) > 0)
  return {
    tooltip: { trigger: 'axis' },
    legend: {
      data: ['Devengado', 'Neto a pagar', ...(hasDrafts ? ['Borrador (provisional)'] : [])],
      top: 0,
      left: 'center',
    },
    grid: { left: 24, right: 24, top: 56, bottom: 16 },
    xAxis: { type: 'category', data: series.map((item) => item.label) },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: (value: number) => `$${(value / 1000000).toFixed(1)}M` },
    },
    series: [
      {
        name: 'Devengado',
        type: 'bar',
        data: series.map((item) => item.totalEarned),
        itemStyle: { color: '#1867C0' },
      },
      {
        name: 'Neto a pagar',
        type: 'line',
        smooth: true,
        data: series.map((item) => item.totalToPay),
        itemStyle: { color: '#4CAF50' },
      },
      ...(hasDrafts
        ? [
            {
              name: 'Borrador (provisional)',
              type: 'bar' as const,
              data: series.map((item) => item.draftTotalToPay ?? 0),
              itemStyle: {
                color: '#FB8C00',
                opacity: 0.65,
                borderColor: '#FB8C00',
                borderWidth: 1,
                borderType: 'dashed' as const,
              },
            },
          ]
        : []),
    ],
  }
})

const absenceChartOptions = computed(() => {
  const byType = overview.value?.absences?.byType ?? []
  const colors = [
    '#1867C0',
    '#48A9A6',
    '#FB8C00',
    '#9C27B0',
    '#4CAF50',
    '#F44336',
    '#607D8B',
  ]
  return {
    tooltip: { trigger: 'item' },
    legend: { top: 0, left: 'center' },
    grid: { top: 40, left: 16, right: 16, bottom: 16 },
    series: [
      {
        name: 'Días de ausencia',
        type: 'pie',
        radius: ['40%', '68%'],
        center: ['50%', '54%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        data: byType.map((item, index) => ({
          name:
            ABSENCE_TYPE_LABELS[item.type as keyof typeof ABSENCE_TYPE_LABELS] ??
            item.type,
          value: item.days,
          itemStyle: { color: colors[index % colors.length] },
        })),
      },
    ],
  }
})

const byContractOptions = computed(() => {
  const breakdown = overview.value?.headcount?.byContractType ?? []
  const labels: Record<string, string> = {
    indefinite: 'Indefinido',
    fixed: 'Fijo',
    work_labor: 'Obra o labor',
    intern: 'Prácticas',
  }
  return {
    tooltip: { trigger: 'item' },
    series: [
      {
        name: 'Colaboradores por contrato',
        type: 'pie',
        radius: '70%',
        data: breakdown.map((item) => ({
          name: labels[item.type] ?? item.type,
          value: item.count,
        })),
        label: { show: breakdown.length > 0, formatter: '{b}: {c}' },
      },
    ],
  }
})

const byPositionOptions = computed(() => {
  const breakdown = overview.value?.headcount?.byPosition ?? []
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 32, right: 24, top: 24, bottom: 16 },
    xAxis: {
      type: 'category',
      data: breakdown.map((item) => item.position),
      axisLabel: { rotate: 20, width: 90, overflow: 'truncate' },
    },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        name: 'Colaboradores',
        type: 'bar',
        data: breakdown.map((item) => item.count),
        itemStyle: { color: '#48A9A6' },
      },
    ],
  }
})

const dailyAttendanceOptions = computed(() => {
  const series = overview.value?.attendance?.dailySeries ?? []
  return {
    tooltip: { trigger: 'axis' },
    legend: {
      data: ['Horas trabajadas', 'Extras diurnas', 'Extras nocturnas'],
      top: 0,
      left: 'center',
    },
    grid: { left: 24, right: 24, top: 56, bottom: 16 },
    xAxis: {
      type: 'category',
      data: series.map((item) => item.date.slice(8)),
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: 'Horas trabajadas',
        type: 'line',
        smooth: true,
        data: series.map((item) => item.hoursWorked),
        itemStyle: { color: '#1867C0' },
      },
      {
        name: 'Extras diurnas',
        type: 'line',
        smooth: true,
        data: series.map((item) => item.overtimeDayHours),
        itemStyle: { color: '#48A9A6' },
      },
      {
        name: 'Extras nocturnas',
        type: 'line',
        smooth: true,
        data: series.map((item) => item.overtimeNightHours),
        itemStyle: { color: '#FB8C00' },
      },
    ],
  }
})

// ---- Heatmap de asistencia (empleados × día de la semana) ----

const WEEKDAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const attendanceHeatmapOptions = computed(() => {
  const employees = overview.value?.heatmap ?? []
  const cells: Array<[number, number, number]> = []
  employees.forEach((employee, employeeIndex) => {
    for (let weekday = 1; weekday <= 6; weekday += 1) {
      const state = employee.weekdays[weekday]
      const justified = state?.justified ?? 0
      const missing = state?.missing ?? 0
      const dominant = missing > 0 ? 0 : justified > 0 ? 0.5 : 1
      cells.push([weekday, employeeIndex, dominant])
    }
  })
  return {
    tooltip: {
      position: 'top',
      formatter: (params: { value: [number, number, number]; dataIndex: number }) => {
        const [weekday, employeeIndex] = params.value
        const employee = employees[employeeIndex]
        const state = employee?.weekdays[weekday] ?? { present: 0, justified: 0, missing: 0 }
        return `${employee?.name ?? ''} · ${WEEKDAY_LABELS[weekday]}<br/>Presente: ${state.present} · Justificada: ${state.justified} · Sin registro: ${state.missing}`
      },
    },
    grid: { left: 90, right: 16, top: 16, bottom: 24 },
    xAxis: {
      type: 'category',
      data: WEEKDAY_LABELS,
      splitArea: { show: true },
    },
    yAxis: {
      type: 'category',
      data: employees.map((employee) => employee.name),
      splitArea: { show: true },
    },
    visualMap: {
      min: 0,
      max: 1,
      calculable: false,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: { color: ['#F44336', '#FB8C00', '#4CAF50'] },
    },
    series: [
      {
        type: 'heatmap',
        data: cells,
        label: { show: false },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' } },
      },
    ],
  }
})

// ---- Gauge de horas extras semanales (límite legal 12h) ----

const overtimeGaugeOptions = computed(() => {
  const value = overview.value?.overtime?.weekOvertimeHours ?? 0
  const limit = overview.value?.overtime?.legalLimit ?? 12
  return {
    series: [
      {
        type: 'gauge',
        min: 0,
        max: limit,
        progress: { show: true, width: 12 },
        axisLine: { lineStyle: { width: 12, color: [[0.67, '#4CAF50'], [0.83, '#FB8C00'], [1, '#F44336']] } },
        pointer: { itemStyle: { color: '#1867C0' } },
        axisTick: { distance: -18 },
        splitLine: { distance: -20 },
        axisLabel: { distance: 12, fontSize: 10 },
        detail: {
          valueAnimation: true,
          formatter: (current: number) => `${current.toFixed(1)}h / ${limit}h`,
          color: '#1867C0',
          fontSize: 14,
          fontWeight: 'bold',
          offsetCenter: [0, '70%'],
        },
        data: [{ value, name: 'Horas extras de la semana' }],
        title: { fontSize: 11, offsetCenter: [0, '95%'] },
      },
    ],
  }
})

// ---- Top 5 ausencias (barras horizontales) ----

const topAbsencesOptions = computed(() => {
  const items = overview.value?.topAbsences ?? []
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 90, right: 24, top: 8, bottom: 16 },
    xAxis: { type: 'value', minInterval: 1 },
    yAxis: {
      type: 'category',
      data: items.map((item) => item.name),
      axisLabel: { width: 90, overflow: 'truncate' },
    },
    series: [
      {
        name: 'Días de ausencia',
        type: 'bar',
        data: items.map((item) => item.days),
        itemStyle: { color: '#1867C0', borderRadius: [0, 6, 6, 0] },
        label: { show: true, position: 'right' },
      },
    ],
  }
})

const payrollTableHeaders = [
  { title: 'Empleado', key: 'name' },
  { title: 'Cargo', key: 'position' },
  { title: 'Devengado', key: 'devengadosTotal' },
  { title: 'Deducido', key: 'deduccionesTotal' },
  { title: 'Neto a pagar', key: 'totalToPay' },
]

const structureTab = ref(0)

const structureChartOptions = computed(() =>
  structureTab.value === 0
    ? (overview.value ? byContractOptions.value : emptyChartOption)
    : (overview.value ? byPositionOptions.value : emptyChartOption),
)

const formatDelta = (delta: number | null | undefined) => {
  if (delta === null || delta === undefined) return null
  return `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`
}

const exportDashboard = () => {
  const data = overview.value
  if (!data) return
  const rows: Array<Record<string, string | number | null | undefined>> = [
    {
      periodo: `${data.period.month}/${data.period.year}`,
      empleados_activos: data.headcount?.activeEmployees ?? 0,
      nomina_neta: data.payroll?.totalToPay ?? 0,
      nomina_devengada: data.payroll?.totalEarned ?? 0,
      promedio_por_empleado: data.payroll?.averageNet ?? 0,
      tasa_ausentismo: data.absences?.rate ?? 0,
      dias_ausencia: data.absences?.totalDays ?? 0,
      horas_mes: data.attendance?.hoursWorked ?? 0,
      horas_extras_semana: data.overtime?.weekOvertimeHours ?? 0,
      alertas_activas: data.alerts?.active ?? 0,
    },
  ]
  for (const item of data.payrollPerEmployee) {
    rows.push({
      empleado: item.name,
      cargo: item.position,
      devengado: (item.devengados as Record<string, number>).total ?? 0,
      deducido: (item.deducciones as Record<string, number>).total ?? 0,
      neto_a_pagar: item.totalToPay,
    })
  }
  for (const item of data.topAbsences) {
    rows.push({
      empleado: item.name,
      dias_ausencia: item.days,
      solicitudes: item.count,
    })
  }
  exportToCsv(`dashboard-${data.period.month}-${data.period.year}.csv`, rows)
}
</script>

<template>
  <div>
    <CommonPageHeader
      title="Reportes y analítica"
      subtitle="Indicadores clave de recursos humanos"
    >
      <template #actions>
        <v-btn
          variant="tonal"
          size="small"
          prepend-icon="mdi-calendar-today"
          :disabled="period.month === dayjs().month() + 1"
          @click="setThisMonth"
        >
          Este mes
        </v-btn>
        <v-btn
          variant="tonal"
          size="small"
          prepend-icon="mdi-calendar-arrow-left"
          @click="setPreviousMonth"
        >
          Mes anterior
        </v-btn>
        <v-select
          v-model="period.month"
          :items="Array.from({ length: 12 }, (_, index) => ({ title: dayjs().month(index).format('MMMM'), value: index + 1 }))"
          item-title="title"
          item-value="value"
          label="Mes"
          variant="solo"
          flat
          density="compact"
          hide-details
          class="mx-2"
          style="max-width: 160px"
          @update:model-value="load"
        />
        <v-select
          v-model="period.year"
          :items="Array.from({ length: 5 }, (_, index) => dayjs().year() - 2 + index)"
          label="Año"
          variant="solo"
          flat
          density="compact"
          hide-details
          class="mx-2"
          style="max-width: 100px"
          @update:model-value="load"
        />
        <v-btn
          variant="tonal"
          prepend-icon="mdi-refresh"
          :loading="loading"
          @click="load"
        >
          Actualizar
        </v-btn>
        <v-btn
          variant="tonal"
          color="primary"
          prepend-icon="mdi-file-export"
          :disabled="!overview"
          @click="exportDashboard"
        >
          Exportar CSV
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

    <v-alert
      v-if="!canView"
      type="warning"
      variant="tonal"
      class="mb-4"
      text="No tienes permisos para ver los reportes."
    />

    <template v-if="canView">
      <div class="d-flex align-center mb-3">
        <h2 class="text-subtitle-1 font-weight-bold mb-0">
          Resumen de {{ monthLabel }}
        </h2>
        <v-chip
          v-if="loading"
          size="small"
          color="primary"
          variant="tonal"
          class="ml-3"
        >
          Cargando…
        </v-chip>
      </div>

      <v-alert
        v-if="overview && !overview.companyConfigured"
        type="info"
        variant="tonal"
        class="mb-4"
        text="Configura primero los datos de la empresa para ver los indicadores."
      />

      <v-alert
        v-if="overview && overview.draftPayrolls.length > 0"
        type="warning"
        variant="tonal"
        class="mb-4"
      >
        <div class="d-flex align-center ga-2 flex-wrap">
          <v-icon>mdi-clock-alert-outline</v-icon>
          <div class="flex-grow-1" style="min-width: 200px">
            <div class="text-body-2 font-weight-medium">
              {{ overview.draftPayrolls.length }} nómina(s) en borrador para este
              período ({{ formatCOP(overview.draftPayrolls.reduce((sum, item) => sum + item.totalToPay, 0)) }})
            </div>
            <div class="text-caption text-medium-emphasis">
              Las cifras oficiales del dashboard solo incluyen nóminas aprobadas o
              pagadas.
            </div>
          </div>
          <v-btn
            size="small"
            variant="tonal"
            color="primary"
            prepend-icon="mdi-cash-multiple"
            to="/admin/payroll"
          >
            Revisar nómina
          </v-btn>
        </div>
      </v-alert>

      <!-- KPIs con variación -->
      <v-row density="compact" class="mb-4">
        <v-col v-for="kpi in kpis" :key="kpi.title" cols="12" sm="6" lg="3">
          <v-card
            class="h-100 cursor-pointer"
            hover
            :to="kpiTargets[kpi.title]"
          >
            <v-card-text>
              <div class="d-flex align-center ga-2 mb-2">
                <v-avatar :color="kpi.color" variant="tonal" size="36">
                  <v-icon size="small" :color="kpi.color">{{ kpi.icon }}</v-icon>
                </v-avatar>
                <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
                  {{ kpi.title }}
                </span>
              </div>
              <div class="d-flex align-end ga-2">
                <div class="text-h6 font-weight-bold">{{ kpi.value }}</div>
                <v-chip
                  v-if="kpi.delta !== undefined && kpi.delta !== null"
                  size="x-small"
                  :color="kpi.delta >= 0 ? 'success' : 'error'"
                  variant="tonal"
                  class="mb-1"
                >
                  <v-icon size="x-small" class="mr-1">
                    {{ kpi.delta >= 0 ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
                  </v-icon>
                  {{ formatDelta(kpi.delta) }}
                </v-chip>
              </div>
              <div class="text-caption text-medium-emphasis">{{ kpi.suffix }}</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Gráficos principales -->
      <v-row density="compact">
        <v-col cols="12" lg="8">
          <v-card class="h-100">
            <v-card-item>
              <v-card-title class="text-subtitle-1 font-weight-bold">
                Evolución de la nómina (últimos 12 meses)
              </v-card-title>
            </v-card-item>
            <v-divider />
            <v-card-text>
              <VChart
                :option="overview ? payrollChartOptions : emptyChartOption"
                autoresize
                style="height: 300px; width: 100%"
              />
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6" lg="4">
          <v-card class="h-100">
            <v-card-item>
              <v-card-title class="text-subtitle-1 font-weight-bold">
                Horas extras de la semana
              </v-card-title>
              <v-card-subtitle class="text-caption">
                Límite legal: 12 h semanales
              </v-card-subtitle>
            </v-card-item>
            <v-divider />
            <v-card-text>
              <VChart
                :option="overview ? overtimeGaugeOptions : emptyChartOption"
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
                Asistencia diaria ({{ monthLabel }})
              </v-card-title>
            </v-card-item>
            <v-divider />
            <v-card-text>
              <VChart
                :option="overview ? dailyAttendanceOptions : emptyChartOption"
                autoresize
                style="height: 300px; width: 100%"
              />
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6" lg="4">
          <v-card class="h-100">
            <v-card-item>
              <v-card-title class="text-subtitle-1 font-weight-bold">
                Heatmap de asistencia
              </v-card-title>
              <v-card-subtitle class="text-caption">
                Verde: presente · Naranja: justificada · Rojo: sin registro
              </v-card-subtitle>
            </v-card-item>
            <v-divider />
            <v-card-text>
              <VChart
                :option="overview ? attendanceHeatmapOptions : emptyChartOption"
                autoresize
                style="height: 320px; width: 100%"
              />
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6" lg="4">
          <v-card class="h-100">
            <v-card-item>
              <v-card-title class="text-subtitle-1 font-weight-bold">
                Top 5 ausencias
              </v-card-title>
            </v-card-item>
            <v-divider />
            <v-card-text>
              <VChart
                :option="overview ? topAbsencesOptions : emptyChartOption"
                autoresize
                style="height: 260px; width: 100%"
              />
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6" lg="4">
          <v-card class="h-100">
            <v-card-item>
              <v-card-title class="text-subtitle-1 font-weight-bold">
                Alertas activas
              </v-card-title>
              <v-card-subtitle class="text-caption">
                Actualización en tiempo real (SSE)
              </v-card-subtitle>
            </v-card-item>
            <v-divider />
            <v-card-text>
              <DashboardAlertList />
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6" lg="4">
          <v-card class="h-100">
            <v-card-item>
              <v-card-title class="text-subtitle-1 font-weight-bold">
                Ausencias por tipo
              </v-card-title>
            </v-card-item>
            <v-divider />
            <v-card-text>
              <VChart
                :option="overview ? absenceChartOptions : emptyChartOption"
                autoresize
                style="height: 260px; width: 100%"
              />
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6" lg="4">
          <v-card class="h-100">
            <v-card-item>
              <v-card-title class="text-subtitle-1 font-weight-bold">
                Incapacidades del mes
              </v-card-title>
            </v-card-item>
            <v-divider />
            <v-list density="compact">
              <v-list-item
                title="Incapacidad común"
                :subtitle="`${overview?.absences?.incapacityBreakdown.comun.days ?? 0} día(s) · ${overview?.absences?.incapacityBreakdown.comun.count ?? 0} caso(s)`"
                prepend-icon="mdi-hospital-box-outline"
              />
              <v-list-item
                title="Incapacidad laboral"
                :subtitle="`${overview?.absences?.incapacityBreakdown.laboral.days ?? 0} día(s) · ${overview?.absences?.incapacityBreakdown.laboral.count ?? 0} caso(s)`"
                prepend-icon="mdi-shield-check-outline"
              />
              <v-list-item
                title="Días de incapacidad"
                :subtitle="`${overview?.absences?.incapacityDays ?? 0} día(s) del mes`"
                prepend-icon="mdi-calendar-clock-outline"
              />
              <v-list-item
                title="Tasa de ausentismo"
                :subtitle="`${(overview?.absences?.rate ?? 0).toFixed(2)}% (días de ausencia ÷ días-hombre)`"
                prepend-icon="mdi-percent-outline"
              />
            </v-list>
          </v-card>
        </v-col>
        <v-col cols="12" md="6" lg="4">
          <v-card class="h-100">
            <v-card-item>
              <v-card-title class="text-subtitle-1 font-weight-bold">
                Estructura
              </v-card-title>
            </v-card-item>
            <v-divider />
            <v-card-text>
              <v-tabs v-model="structureTab" density="compact">
                <v-tab :value="0">Por contrato</v-tab>
                <v-tab :value="1">Por cargo</v-tab>
              </v-tabs>
              <VChart
                :option="structureChartOptions"
                autoresize
                style="height: 220px; width: 100%"
              />
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12">
          <v-card class="h-100">
            <v-card-item>
              <v-card-title class="text-subtitle-1 font-weight-bold">
                Nómina por empleado ({{ monthLabel }})
              </v-card-title>
            </v-card-item>
            <v-divider />
            <v-data-table
              :headers="payrollTableHeaders"
              :items="overview?.payrollPerEmployee ?? []"
              density="compact"
              :loading="loading"
            >
              <template #[`item.devengados.total`]="{ item }">
                {{ formatCOP((item.devengados as Record<string, number>).total ?? 0) }}
              </template>
              <template #[`item.deducciones.total`]="{ item }">
                {{ formatCOP((item.deducciones as Record<string, number>).total ?? 0) }}
              </template>
              <template #[`item.totalToPay`]="{ item }">
                <span class="font-weight-medium">
                  {{ formatCOP(item.totalToPay) }}
                </span>
              </template>
            </v-data-table>
            <v-card-text v-if="!overview?.payrollPerEmployee.length" class="text-medium-emphasis">
              Sin nóminas aprobadas para este período.
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </div>
</template>
