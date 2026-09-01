<script setup lang="ts">
import { ROLES, type UserRole } from '~~/shared/auth'
import type { IPayrollView } from '~/composables/states/usePayrollState'
import { formatCOP } from '~/utils/number-helpers'
import { formatDate } from '~~/shared/utils/datetime-helpers'
import { API_PATHS } from '~/utils/api-paths'
import { PayrollTable } from '#components'
import VChart from 'vue-echarts'

definePageMeta({
  middleware: 'auth',
})

const { user } = useAuthState()
useModuleGuard()
const snackbar = useSnackbarState()
const {
  payrolls,
  total,
  loading,
  error,
  fetchPayrolls,
  createPayroll,
  approvePayroll,
  payPayroll,
  cancelPayroll,
} = usePayrollState()

const role = computed(() => user.value?.role)
const canManage = computed(
  () =>
    !!role.value &&
    ([ROLES.ADMIN, ROLES.MANAGER, ROLES.HR] as UserRole[]).includes(role.value),
)
const canApprove = computed(
  () => !!role.value && [ROLES.ADMIN, ROLES.MANAGER].includes(role.value),
)
const canPay = computed(() => role.value === ROLES.ADMIN)

const statusFilter = ref('')
const options = ref({ page: 1, itemsPerPage: 10 })
const createOpen = ref(false)

// ---- Dashboard general de nóminas ----

interface IPayrollDashboard {
  counts: Record<string, number>
  totals: {
    totalEarned: number
    totalDeducted: number
    totalSocialSecurity: number
    totalToPay: number
  }
  statusAmounts: Record<string, { count: number; totalToPay: number }>
  employeeCount: number
  averageNet: number
  evolution: Array<{
    _id: string
    periodStart?: string
    periodEnd?: string
    status: string
    totalToPay: number
    totalEarned: number
    employeeCount: number
  }>
}

const dashboard = ref<IPayrollDashboard | null>(null)
const dashboardLoading = ref(false)

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  approved: 'Aprobada',
  paid: 'Pagada',
  cancelled: 'Anulada',
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#FB8C00',
  approved: '#1867C0',
  paid: '#4CAF50',
  cancelled: '#F44336',
}

const fetchDashboard = async () => {
  dashboardLoading.value = true
  try {
    const data = await authFetch<IPayrollDashboard>(API_PATHS.payroll.dashboard)
    dashboard.value = data
  } catch {
    // Silencioso: la tabla de nóminas sigue funcionando sin el dashboard.
  } finally {
    dashboardLoading.value = false
  }
}

const dashboardKpis = computed(() => {
  const data = dashboard.value
  const totalCount = data
    ? Object.values(data.counts).reduce((sum, value) => sum + value, 0)
    : 0
  return [
    {
      title: 'Nóminas',
      value: totalCount,
      suffix: data
        ? `${data.counts.paid ?? 0} pagadas · ${data.counts.draft ?? 0} en borrador`
        : 'Cargando…',
      icon: 'mdi-file-cabinet',
      color: 'primary',
    },
    {
      title: 'Neto a pagar',
      value: data ? formatCOP(data.totals.totalToPay) : '$0',
      suffix: 'Suma de nóminas no anuladas',
      icon: 'mdi-cash-multiple',
      color: 'success',
    },
    {
      title: 'Empleados liquidados',
      value: data?.employeeCount ?? 0,
      suffix: 'Fichas con liquidación (no anuladas)',
      icon: 'mdi-account-group-outline',
      color: 'info',
    },
    {
      title: 'Promedio por nómina',
      value: data ? formatCOP(data.averageNet) : '$0',
      suffix: 'Neto promedio de las últimas nóminas',
      icon: 'mdi-chart-line',
      color: 'purple',
    },
  ]
})

const statusDonutOptions = computed(() => {
  const data = dashboard.value
  const entries = data
    ? Object.entries(data.counts)
        .filter(([, count]) => count > 0)
        .map(([status, count]) => ({
          name: STATUS_LABELS[status] ?? status,
          value: count,
          itemStyle: { color: STATUS_COLORS[status] ?? '#607D8B' },
        }))
    : []
  return {
    tooltip: { trigger: 'item' },
    legend: { top: 0, left: 'center' },
    series: [
      {
        name: 'Nóminas por estado',
        type: 'pie' as const,
        radius: ['42%', '68%'],
        center: ['50%', '55%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        data: entries,
      },
    ],
  }
})

const evolutionOptions = computed(() => {
  const items = dashboard.value?.evolution ?? []
  return {
    tooltip: { trigger: 'axis' },
    legend: { top: 0, left: 'center' },
    grid: { left: 24, right: 24, top: 48, bottom: 24 },
    xAxis: {
      type: 'category' as const,
      data: items.map((item) => formatDate(item.periodStart, 'MMM YYYY')),
      axisLabel: {
        interval: 0,
        rotate: items.length > 5 ? 30 : 0,
        fontSize: 11,
      },
    },
    yAxis: {
      type: 'value' as const,
      axisLabel: {
        formatter: (value: number) => `$${(value / 1000000).toFixed(1)}M`,
      },
    },
    series: [
      {
        name: 'Neto a pagar',
        type: 'bar' as const,
        barMaxWidth: 42,
        data: items.map((item) => ({
          value: item.totalToPay,
          itemStyle: { color: STATUS_COLORS[item.status] ?? '#607D8B' },
        })),
      },
    ],
  }
})

const load = async () => {
  try {
    await fetchPayrolls({
      page: options.value.page,
      limit: options.value.itemsPerPage,
      status: statusFilter.value || undefined,
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

onMounted(() => {
  load()
  fetchDashboard()
})

const onCreated = async (data: {
  periodStart: string
  periodEnd: string
  cycleId?: string
}) => {
  try {
    await createPayroll(data)
    snackbar.success('Nómina creada en borrador')
    await load()
  } catch {
    // Error visible en el VAlert.
  }
}

const run = async (
  fn: (id: string) => Promise<unknown>,
  id: string,
  message: string,
) => {
  try {
    await fn(id)
    snackbar.success(message)
    await load()
  } catch {
    // Error visible en el VAlert.
  }
}

const handleView = (payroll: IPayrollView) =>
  navigateTo(`/admin/payroll/${payroll._id}`)
</script>

<template>
  <div>
    <CommonPageHeader
      title="Nómina"
      subtitle="Liquidación de períodos y pagos"
    >
      <template #actions>
        <v-btn
          v-if="canManage"
          color="primary"
          variant="tonal"
          prepend-icon="mdi-plus"
          @click="createOpen = true"
        >
          Nueva nómina
        </v-btn>
      </template>
    </CommonPageHeader>

    <!-- Dashboard general de nóminas -->
    <v-progress-linear
      v-if="dashboardLoading && !dashboard"
      indeterminate
      color="primary"
      height="4"
      class="mb-2"
    />

    <v-row v-if="dashboard" density="compact" class="mb-4">
      <v-col v-for="kpi in dashboardKpis" :key="kpi.title" cols="12" sm="6" lg="3">
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

    <v-row v-if="dashboard" density="compact" class="mb-4">
      <v-col cols="12" md="5">
        <v-card class="h-100">
          <v-card-item>
            <v-card-title class="text-subtitle-1 font-weight-bold">
              Nóminas por estado
            </v-card-title>
          </v-card-item>
          <v-divider />
          <v-card-text>
            <VChart
              :option="statusDonutOptions"
              autoresize
              style="height: 260px; width: 100%"
            />
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="7">
        <v-card class="h-100">
          <v-card-item>
            <v-card-title class="text-subtitle-1 font-weight-bold">
              Evolución del neto a pagar
            </v-card-title>
            <v-card-subtitle class="text-caption">
              Últimas nóminas liquidadas · color según estado
            </v-card-subtitle>
          </v-card-item>
          <v-divider />
          <v-card-text>
            <VChart
              :option="evolutionOptions"
              autoresize
              style="height: 260px; width: 100%"
            />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <div v-if="canManage" class="position-relative">
      <v-progress-linear
        v-if="loading"
        indeterminate
        color="primary"
        height="4"
        class="position-absolute top-0 left-0 right-0"
        style="z-index: 1"
      />
      <CommonListToolbar hide-search :loading="loading">
        <template #filters>
          <v-select
            v-model="statusFilter"
            :items="[
              { title: 'Todos', value: '' },
              { title: 'Borrador', value: 'draft' },
              { title: 'Aprobada', value: 'approved' },
              { title: 'Pagada', value: 'paid' },
              { title: 'Anulada', value: 'cancelled' },
            ]"
            label="Estado"
            style="max-width: 180px"
            @update:model-value="statusFilter = $event; options.page = 1; load()"
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

    <v-card v-if="canManage" class="overflow-hidden">
      <PayrollTable
        :items="payrolls"
        :total="total"
        :loading="false"
        :page="options.page"
        :items-per-page="options.itemsPerPage"
        :can-approve="canApprove"
        :can-pay="canPay"
        :can-cancel="canPay"
        @update:options="onUpdateOptions"
        @view="handleView"
        @approve="(p) => run(approvePayroll, p._id, 'Nómina aprobada')"
        @pay="(p) => run(payPayroll, p._id, 'Nómina pagada')"
        @cancel="(p) => run(cancelPayroll, p._id, 'Nómina anulada')"
      />
    </v-card>

    <v-alert
      v-else
      type="warning"
      variant="tonal"
      text="No tienes permisos para ver la nómina."
    />

    <PayrollFormDialog
      v-model="createOpen"
      @saved="onCreated"
    />
  </div>
</template>
