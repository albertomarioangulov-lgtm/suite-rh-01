<script setup lang="ts">
import { ROLES } from '~~/shared/auth'
import { formatDate } from '~~/shared/utils/datetime-helpers'
import { formatCOP } from '~/utils/number-helpers'
import type { IPayrollEntry } from '~/composables/states/usePayrollState'
import { API_PATHS } from '~/utils/api-paths'
import VChart from 'vue-echarts'

definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const payrollId = computed(() => String(route.params.id))
const tab = ref('summary')
const employeeSearch = ref('')
const { viewMode, toggleView } = useViewMode('payroll-employees-view-mode')
const breakdownOpen = ref(false)
const selectedEntry = ref<IPayrollEntry | null>(null)
const adjustDialog = ref(false)
const adjustingEntry = ref<IPayrollEntry | null>(null)
const savingAdjustment = ref(false)
const adjustmentForm = reactive({
  bonuses: 0,
  commissions: 0,
  garnishments: 0,
  loans: 0,
})

const { user: authUser } = useAuthState()
const snackbar = useSnackbarState()
const {
  currentPayroll,
  loading,
  error,
  fetchPayrollById,
  updatePayroll,
  approvePayroll,
  payPayroll,
  cancelPayroll,
  recalculatePayroll,
  payrollHistory,
  fetchPayrollHistory,
} = usePayrollState()

const role = computed(() => authUser.value?.role)
const cycleNameOf = computed(() => {
  const cycle = currentPayroll.value?.cycle
  if (typeof cycle === 'object' && cycle) return cycle.name ?? ''
  return typeof cycle === 'string' ? cycle : ''
})
const canApprove = computed(
  () => !!role.value && [ROLES.ADMIN, ROLES.MANAGER].includes(role.value),
)
const canPay = computed(() => role.value === ROLES.ADMIN)
const canAdjust = computed(
  () =>
    !!role.value &&
    [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR].includes(role.value),
)

const load = async () => {
  try {
    await fetchPayrollById(payrollId.value)
    await fetchPayrollHistory(payrollId.value)
  } catch {
    // Error visible en VAlert.
  }
}

watch(payrollId, load, { immediate: true })

const run = async (fn: (id: string) => Promise<unknown>, message: string) => {
  try {
    await fn(payrollId.value)
    snackbar.success(message)
    await load()
  } catch {
    // Error visible en VAlert.
  }
}

const historyMeta: Record<string, { icon: string; color: string; label: string }> = {
  create: { icon: 'mdi-plus-circle-outline', color: 'success', label: 'Creación' },
  update: { icon: 'mdi-pencil-outline', color: 'primary', label: 'Actualización' },
  recalculate: { icon: 'mdi-refresh', color: 'warning', label: 'Recálculo' },
  approve: { icon: 'mdi-check-circle-outline', color: 'success', label: 'Aprobación' },
  pay: { icon: 'mdi-cash', color: 'primary', label: 'Pago' },
  cancel: { icon: 'mdi-cancel', color: 'error', label: 'Anulación' },
}

const historyMetaOf = (action: string) => historyMeta[action] ?? historyMeta.update

// ---- Dashboard de la nómina (resumen) ----

const employeeNameOf = (entry: IPayrollEntry) => {
  const employee = entry.employee
  if (typeof employee === 'object' && employee) {
    return (
      `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() ||
      'Empleado'
    )
  }
  return 'Empleado'
}

const employeeDocumentOf = (entry: IPayrollEntry) => {
  const employee = entry.employee
  if (typeof employee === 'object' && employee) {
    return String(employee.document ?? '')
  }
  return ''
}

const filteredEmployees = computed(() => {
  const query = employeeSearch.value.trim().toLowerCase()
  const all = currentPayroll.value?.employees ?? []
  if (!query) return all
  return all.filter((entry) => {
    const name = employeeNameOf(entry).toLowerCase()
    const document = employeeDocumentOf(entry).toLowerCase()
    return name.includes(query) || document.includes(query)
  })
})

const employeeHeaders = [
  { title: 'Empleado', key: 'employee' },
  { title: 'Días', key: 'days', sortable: true },
  { title: 'Devengado', key: 'devengado', sortable: true, align: 'end' },
  { title: 'Deducciones', key: 'deducciones', sortable: true, align: 'end' },
  { title: 'Seg. social', key: 'social', sortable: true, align: 'end' },
  { title: 'Neto a pagar', key: 'neto', sortable: true, align: 'end' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
]

const openBreakdown = (entry: IPayrollEntry) => {
  selectedEntry.value = entry
  breakdownOpen.value = true
}

const employeeIdOf = (entry: IPayrollEntry) =>
  typeof entry.employee === 'object' && entry.employee
    ? String(entry.employee._id)
    : String(entry.employee)

const openAdjust = (entry: IPayrollEntry) => {
  adjustingEntry.value = entry
  adjustmentForm.bonuses = entry.devengados.bonuses ?? 0
  adjustmentForm.commissions = entry.devengados.commissions ?? 0
  adjustmentForm.garnishments = entry.deducciones.garnishments ?? 0
  adjustmentForm.loans = entry.deducciones.loans ?? 0
  adjustDialog.value = true
}

const saveAdjustment = async () => {
  if (!adjustingEntry.value) return
  savingAdjustment.value = true
  try {
    await updatePayroll(payrollId.value, {
      employees: [
        {
          employeeId: employeeIdOf(adjustingEntry.value),
          bonuses: Number(adjustmentForm.bonuses) || 0,
          commissions: Number(adjustmentForm.commissions) || 0,
          garnishments: Number(adjustmentForm.garnishments) || 0,
          loans: Number(adjustmentForm.loans) || 0,
        },
      ],
    })
    snackbar.success('Ajustes guardados')
    adjustDialog.value = false
    await fetchPayrollHistory(payrollId.value)
  } catch {
    // Error visible en VAlert.
  } finally {
    savingAdjustment.value = false
  }
}

const onRowClick = (
  _event: unknown,
  data: { item?: { entry?: IPayrollEntry } },
) => {
  if (data?.item?.entry) openBreakdown(data.item.entry)
}

const downloadCen = (entry: IPayrollEntry) => {
  const url = `${API_PATHS.payroll.cen(payrollId.value)}?employeeId=${employeeIdOf(entry)}`
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = ''
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

const downloadAllCen = () => {
  const anchor = document.createElement('a')
  anchor.href = API_PATHS.payroll.cenAll(payrollId.value)
  anchor.download = ''
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

const employeeRows = computed(() =>
  filteredEmployees.value.map((entry) => ({
    entry,
    employee: employeeNameOf(entry),
    document: employeeDocumentOf(entry),
    days: entry.devengados.daysWorked,
    devengado: entry.devengados.total,
    deducciones: entry.deducciones.total,
    social: entry.seguridadSocial.total,
    neto: entry.totalToPay,
  })),
)

const sumOf = (
  entries: IPayrollEntry[],
  pick: (entry: IPayrollEntry) => number,
) => entries.reduce((sum, entry) => sum + (pick(entry) || 0), 0)

const summaryKpis = computed(() => {
  const payroll = currentPayroll.value
  if (!payroll) return []
  const employees = payroll.employees ?? []
  const average = employees.length ? payroll.totalToPay / employees.length : 0
  return [
    {
      title: 'Total devengado',
      value: formatCOP(payroll.totalEarned),
      icon: 'mdi-account-cash-outline',
      color: 'success',
    },
    {
      title: 'Total deducciones',
      value: formatCOP(payroll.totalDeducted),
      icon: 'mdi-cash-minus',
      color: 'error',
    },
    {
      title: 'Seguridad social (empleador)',
      value: formatCOP(payroll.totalSocialSecurity),
      icon: 'mdi-shield-account-outline',
      color: 'info',
    },
    {
      title: 'Neto a pagar',
      value: formatCOP(payroll.totalToPay),
      icon: 'mdi-cash-multiple',
      color: 'primary',
    },
    {
      title: 'Empleados liquidados',
      value: employees.length,
      icon: 'mdi-account-group-outline',
      color: 'purple',
    },
    {
      title: 'Promedio neto por empleado',
      value: formatCOP(average),
      icon: 'mdi-chart-line',
      color: 'teal',
    },
  ]
})

const donutOptions = (
  data: Array<{ name: string; value: number }>,
  colors: string[],
) => ({
  tooltip: { trigger: 'item' },
  legend: { top: 0, left: 'center' },
  series: [
    {
      name: 'Composición',
      type: 'pie' as const,
      radius: ['42%', '68%'],
      center: ['50%', '55%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      data: data.map((item, index) => ({
        ...item,
        itemStyle: { color: colors[index % colors.length] },
      })),
    },
  ],
})

const PIE_COLORS = [
  '#1867C0',
  '#48A9A6',
  '#FB8C00',
  '#9C27B0',
  '#4CAF50',
  '#F44336',
  '#607D8B',
]

const devengadoOptions = computed(() => {
  const entries = currentPayroll.value?.employees ?? []
  const data = [
    {
      name: 'Salario base',
      value: sumOf(entries, (entry) => entry.devengados.baseSalary),
    },
    {
      name: 'Auxilio de transporte',
      value: sumOf(entries, (entry) => entry.devengados.transportAllowance),
    },
    {
      name: 'Horas extra',
      value: sumOf(
        entries,
        (entry) =>
          entry.devengados.overtimeDay + entry.devengados.overtimeNight,
      ),
    },
    {
      name: 'Recargo nocturno',
      value: sumOf(entries, (entry) => entry.devengados.nightSurcharge),
    },
    {
      name: 'Bonificaciones',
      value: sumOf(entries, (entry) => entry.devengados.bonuses),
    },
    {
      name: 'Comisiones',
      value: sumOf(entries, (entry) => entry.devengados.commissions),
    },
    {
      name: 'Incapacidades y ausencias',
      value: sumOf(
        entries,
        (entry) =>
          entry.devengados.absenceCompanyPaidValue +
          entry.devengados.absenceEpsValue +
          entry.devengados.absenceArlValue,
      ),
    },
  ].filter((item) => item.value > 0)
  return donutOptions(data, PIE_COLORS)
})

const deduccionesOptions = computed(() => {
  const entries = currentPayroll.value?.employees ?? []
  const data = [
    {
      name: 'Salud empleado (4%)',
      value: sumOf(entries, (entry) => entry.deducciones.employeeHealth),
    },
    {
      name: 'Pensión empleado (4%)',
      value: sumOf(entries, (entry) => entry.deducciones.employeePension),
    },
    {
      name: 'Retención en la fuente',
      value: sumOf(entries, (entry) => entry.deducciones.sourceRetention),
    },
    {
      name: 'Embargos',
      value: sumOf(entries, (entry) => entry.deducciones.garnishments),
    },
    {
      name: 'Préstamos',
      value: sumOf(entries, (entry) => entry.deducciones.loans),
    },
  ].filter((item) => item.value > 0)
  return donutOptions(data, PIE_COLORS)
})

const seguridadSocialOptions = computed(() => {
  const entries = currentPayroll.value?.employees ?? []
  const data = [
    {
      name: 'Salud empleador (8,5%)',
      value: sumOf(entries, (entry) => entry.seguridadSocial.employerHealth),
    },
    {
      name: 'Pensión empleador (12%)',
      value: sumOf(entries, (entry) => entry.seguridadSocial.employerPension),
    },
    {
      name: 'ARL',
      value: sumOf(entries, (entry) => entry.seguridadSocial.arl),
    },
    {
      name: 'SENA (2%)',
      value: sumOf(entries, (entry) => entry.seguridadSocial.sena),
    },
    {
      name: 'ICBF (3%)',
      value: sumOf(entries, (entry) => entry.seguridadSocial.icbf),
    },
    {
      name: 'Caja de compensación (4%)',
      value: sumOf(entries, (entry) => entry.seguridadSocial.compensationFund),
    },
  ].filter((item) => item.value > 0)
  return donutOptions(data, PIE_COLORS)
})

const topEmployeesOptions = computed(() => {
  const entries = [...(currentPayroll.value?.employees ?? [])]
    .sort((a, b) => b.totalToPay - a.totalToPay)
    .slice(0, 8)
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (value: number) => formatCOP(value),
    },
    grid: { left: 96, right: 24, top: 8, bottom: 24 },
    xAxis: {
      type: 'value' as const,
      axisLabel: {
        formatter: (value: number) => `$${(value / 1000000).toFixed(1)}M`,
      },
    },
    yAxis: {
      type: 'category' as const,
      data: entries.map(employeeNameOf).reverse(),
      axisLabel: { width: 110, overflow: 'truncate', fontSize: 11 },
    },
    series: [
      {
        name: 'Neto a pagar',
        type: 'bar' as const,
        barMaxWidth: 18,
        data: entries.map((entry) => entry.totalToPay).reverse(),
        itemStyle: { color: '#1867C0', borderRadius: [0, 6, 6, 0] },
      },
    ],
  }
})
</script>

<template>
  <div>
    <div class="d-flex align-center ga-2 mb-3">
      <v-btn
        icon="mdi-arrow-left"
        variant="text"
        @click="navigateTo('/admin/payroll')"
      />
      <h1 class="text-h6 font-weight-bold mt-0 mb-0">Detalle de nómina</h1>
      <v-chip
        v-if="cycleNameOf"
        size="small"
        color="primary"
        variant="tonal"
        prepend-icon="mdi-calendar-refresh-outline"
        class="ml-1"
      >
        {{ cycleNameOf }}
      </v-chip>
      <v-spacer />
      <template v-if="currentPayroll">
        <v-btn
          v-if="canAdjust && currentPayroll.employees?.length"
          variant="text"
          color="teal"
          prepend-icon="mdi-folder-zip-outline"
          @click="downloadAllCen"
        >
          CEN (ZIP)
        </v-btn>
        <v-btn
          v-if="canApprove && currentPayroll.status === 'draft'"
          variant="tonal"
          color="success"
          prepend-icon="mdi-check"
          @click="run(approvePayroll, 'Nómina aprobada')"
        >
          Aprobar
        </v-btn>
        <v-btn
          v-if="canPay && currentPayroll.status === 'approved'"
          variant="tonal"
          color="primary"
          prepend-icon="mdi-cash"
          @click="run(payPayroll, 'Nómina pagada')"
        >
          Pagar
        </v-btn>
        <v-btn
          v-if="canPay && ['draft', 'approved'].includes(currentPayroll.status)"
          variant="text"
          color="error"
          prepend-icon="mdi-cancel"
          @click="run(cancelPayroll, 'Nómina anulada')"
        >
          Anular
        </v-btn>
        <v-btn
          v-if="currentPayroll.status === 'draft'"
          variant="text"
          prepend-icon="mdi-refresh"
          @click="run(recalculatePayroll, 'Nómina recalculada')"
        >
          Recalcular
        </v-btn>
      </template>
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

    <v-tabs v-model="tab" color="primary" class="mb-3">
      <v-tab value="summary" prepend-icon="mdi-view-dashboard-outline">
        Resumen
      </v-tab>
      <v-tab value="employees" prepend-icon="mdi-account-group-outline">
        Empleados
      </v-tab>
      <v-tab value="history" prepend-icon="mdi-history">Historial</v-tab>
    </v-tabs>

    <template v-if="currentPayroll && tab === 'summary'">
      <v-row density="compact" class="mb-4">
        <v-col
          v-for="kpi in summaryKpis"
          :key="kpi.title"
          cols="12"
          sm="6"
          lg="4"
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
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row density="compact">
        <v-col cols="12" md="6">
          <v-card class="h-100">
            <v-card-item>
              <v-card-title class="text-subtitle-1 font-weight-bold">
                Composición del devengado
              </v-card-title>
            </v-card-item>
            <v-divider />
            <v-card-text>
              <VChart
                :option="devengadoOptions"
                autoresize
                style="height: 280px; width: 100%"
              />
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card class="h-100">
            <v-card-item>
              <v-card-title class="text-subtitle-1 font-weight-bold">
                Deducciones
              </v-card-title>
            </v-card-item>
            <v-divider />
            <v-card-text>
              <VChart
                :option="deduccionesOptions"
                autoresize
                style="height: 280px; width: 100%"
              />
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card class="h-100">
            <v-card-item>
              <v-card-title class="text-subtitle-1 font-weight-bold">
                Seguridad social (empleador)
              </v-card-title>
            </v-card-item>
            <v-divider />
            <v-card-text>
              <VChart
                :option="seguridadSocialOptions"
                autoresize
                style="height: 280px; width: 100%"
              />
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card class="h-100">
            <v-card-item>
              <v-card-title class="text-subtitle-1 font-weight-bold">
                Top empleados por neto a pagar
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

    <div v-if="currentPayroll && tab === 'employees'">
      <CommonListToolbar
        v-model:search="employeeSearch"
        :view-mode="viewMode"
        search-placeholder="Buscar por nombre o documento…"
        @update:view-mode="toggleView"
      >
        <template #filters>
          <v-chip size="small" variant="tonal" color="primary" class="ml-2">
            {{ filteredEmployees.length }} de
            {{ currentPayroll.employees?.length ?? 0 }} empleados
          </v-chip>
        </template>
      </CommonListToolbar>

      <v-data-table
        v-if="viewMode === 'table'"
        :headers="employeeHeaders"
        :items="employeeRows"
        density="compact"
        hover
        class="rounded-lg overflow-hidden"
        @click:row="onRowClick"
      >
        <template #[`item.employee`]="{ item }">
          <div class="font-weight-medium">{{ item.employee }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.document }}</div>
        </template>
        <template #[`item.days`]="{ item }">
          {{ item.days }} día(s)
        </template>
        <template #[`item.devengado`]="{ item }">
          {{ formatCOP(item.devengado) }}
        </template>
        <template #[`item.deducciones`]="{ item }">
          {{ formatCOP(item.deducciones) }}
        </template>
        <template #[`item.social`]="{ item }">
          {{ formatCOP(item.social) }}
        </template>
        <template #[`item.neto`]="{ item }">
          <span class="font-weight-medium">{{ formatCOP(item.neto) }}</span>
        </template>
        <template #[`item.actions`]="{ item }">
          <v-btn
            icon="mdi-file-xml-box"
            size="small"
            variant="text"
            color="teal"
            title="Descargar CEN XML"
            @click="downloadCen(item.entry)"
          />
          <v-btn
            icon="mdi-file-eye-outline"
            size="small"
            variant="text"
            color="primary"
            title="Ver desglose"
            @click="openBreakdown(item.entry)"
          />
          <v-btn
            v-if="canAdjust && currentPayroll.status === 'draft'"
            icon="mdi-cash-edit"
            size="small"
            variant="text"
            color="warning"
            title="Ajustar conceptos"
            @click.stop="openAdjust(item.entry)"
          />
        </template>
        <template #no-data>
          No hay empleados en esta nómina.
        </template>
      </v-data-table>

      <v-row v-else density="compact">
        <v-col
          v-for="entry in filteredEmployees"
          :key="String(entry.employee?._id ?? entry.employee)"
          cols="12"
          sm="6"
          md="4"
        >
          <PayrollEmployeeSummary :entry="entry" />
        </v-col>
      </v-row>
    </div>

    <div v-if="tab === 'history'">
      <v-timeline v-if="payrollHistory.length" side="end" density="compact">
        <v-timeline-item
          v-for="log in payrollHistory"
          :key="log._id"
          :icon="historyMetaOf(log.action).icon"
          :color="historyMetaOf(log.action).color"
          fill-dot
        >
          <v-card>
            <v-card-text>
              <div class="font-weight-bold">
                {{ historyMetaOf(log.action).label }}
              </div>
              <div class="text-body-2 mt-1">{{ log.description }}</div>
              <div class="text-caption text-medium-emphasis mt-1">
                {{ formatDate(log.createdAt, 'DD/MM/YYYY HH:mm') }} · {{ log.userName || '—' }}
              </div>
            </v-card-text>
          </v-card>
        </v-timeline-item>
      </v-timeline>
      <v-card v-else class="text-center pa-8">
        <p class="text-medium-emphasis">Aún no hay cambios registrados.</p>
      </v-card>
    </div>

    <v-dialog v-model="breakdownOpen" max-width="560">
      <v-card v-if="selectedEntry">
        <v-card-item>
          <template #prepend>
            <v-avatar color="primary" variant="tonal" size="44">
              <v-icon color="primary">mdi-account-details-outline</v-icon>
            </v-avatar>
          </template>
          <v-card-title class="text-subtitle-1 font-weight-bold">
            {{ employeeNameOf(selectedEntry) }}
          </v-card-title>
          <v-card-subtitle>
            {{ employeeDocumentOf(selectedEntry) || 'Sin documento' }} ·
            {{ selectedEntry.devengados.daysWorked }} día(s) · Neto
            {{ formatCOP(selectedEntry.totalToPay) }}
          </v-card-subtitle>
          <template #append>
            <v-btn
              icon="mdi-close"
              variant="text"
              size="small"
              @click="breakdownOpen = false"
            />
          </template>
        </v-card-item>
        <v-divider />
        <PayrollEmployeeBreakdown :entry="selectedEntry" />
        <v-card-actions
          v-if="canAdjust && currentPayroll.status === 'draft'"
        >
          <v-spacer />
          <v-btn
            color="warning"
            variant="tonal"
            prepend-icon="mdi-cash-edit"
            @click="openAdjust(selectedEntry); breakdownOpen = false"
          >
            Ajustar conceptos
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="adjustDialog" max-width="540">
      <v-card v-if="adjustingEntry">
        <v-card-item>
          <template #prepend>
            <v-avatar color="warning" variant="tonal" size="44">
              <v-icon color="warning">mdi-cash-edit</v-icon>
            </v-avatar>
          </template>
          <v-card-title class="text-subtitle-1 font-weight-bold">
            Ajustar conceptos
          </v-card-title>
          <v-card-subtitle>
            {{ employeeNameOf(adjustingEntry) }} ·
            {{ employeeDocumentOf(adjustingEntry) || 'Sin documento' }}
          </v-card-subtitle>
          <template #append>
            <v-btn
              icon="mdi-close"
              variant="text"
              size="small"
              @click="adjustDialog = false"
            />
          </template>
        </v-card-item>
        <v-divider />
        <v-card-text>
          <p class="text-caption text-medium-emphasis mb-3">
            Los valores se suman al cálculo automático del empleado y se
            reflejan en el DSNE. Solo aplica mientras la nómina esté en
            borrador.
          </p>
          <v-row density="compact">
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="adjustmentForm.bonuses"
                label="Bonificaciones ($)"
                type="number"
                min="0"
                prefix="$"
                class="mb-3"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="adjustmentForm.commissions"
                label="Comisiones ($)"
                type="number"
                min="0"
                prefix="$"
                class="mb-3"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="adjustmentForm.garnishments"
                label="Embargos ($)"
                type="number"
                min="0"
                prefix="$"
                class="mb-3"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="adjustmentForm.loans"
                label="Préstamos ($)"
                type="number"
                min="0"
                prefix="$"
                class="mb-3"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="adjustDialog = false">
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            variant="tonal"
            :loading="savingAdjustment"
            @click="saveAdjustment"
          >
            Guardar ajustes
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-card v-if="loading && !currentPayroll" max-width="640" class="mx-auto">
      <v-skeleton-loader type="list-item-two-line, divider, list-item-three-line" />
    </v-card>
  </div>
</template>
