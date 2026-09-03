<script setup lang="ts">
import { API_BASE } from '~/utils/api-paths'
import { formatDate } from '~~/shared/utils/datetime-helpers'
import { ROLES } from '~~/shared/auth'

export interface IBellAlert {
  _id: string
  employee?:
    | string
    | { _id: string; firstName: string; lastName: string }
  module: string
  type: string
  message: string
  read: boolean
  count?: number
  createdAt?: string
}

const { authFetch, user } = useAuthState()
const snackbar = useSnackbarState()

const alerts = useState<IBellAlert[]>('bell-alerts', () => [])
const pollingInterval = ref(0)
const open = ref(false)
const loading = ref(false)
const marking = ref<string | null>(null)

const unreadCount = computed(() => alerts.value.filter((alert) => !alert.read).length)
const badgeLabel = computed(() =>
  unreadCount.value > 99 ? '99+' : String(unreadCount.value),
)

const fetchAlerts = async (silent = false) => {
  if (!silent) loading.value = true
  try {
    const data = await authFetch<{ items: IBellAlert[] }>(
      `${API_BASE}/analytics/alerts`,
    )
    alerts.value = data.items
  } catch {
    // Silencioso: la campana no debe romper la navegación.
  } finally {
    loading.value = false
  }
}

const loadConfig = async () => {
  try {
    const data = await authFetch<{ pollingIntervalSeconds?: number }>(
      `${API_BASE}/analytics/alert-config`,
    )
    pollingInterval.value = data.pollingIntervalSeconds ?? 0
    restartPolling()
  } catch {
    // Configuración no disponible: sin polling.
  }
}

const restartPolling = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  if (pollingInterval.value > 0) {
    timer = setInterval(() => fetchAlerts(true), pollingInterval.value * 1000)
  }
}

let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  fetchAlerts(true)
  loadConfig()
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const employeeName = (alert: IBellAlert) => {
  const employee = alert.employee
  if (typeof employee === 'object' && employee) {
    return `${employee.firstName} ${employee.lastName}`
  }
  return ''
}

const alertTarget = (alert: IBellAlert) => {
  if (alert.module === 'payroll') return '/admin/payroll'
  if (alert.module === 'evaluation') {
    const role = user.value?.role
    return role && [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR, ROLES.SUPERADMIN].includes(role)
      ? '/admin/evaluations'
      : ''
  }
  if (alert.module === 'absence' && employeeName(alert)) {
    const role = user.value?.role
    return role && [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR, ROLES.SUPERADMIN].includes(role)
      ? `/admin/employees/${String((alert.employee as { _id: string })._id)}`
      : '/portal'
  }
  return '/admin/attendance'
}

const alertIcon = (type: string) =>
  type === 'overtime_limit'
    ? 'mdi-clock-alert-outline'
    : type === 'warning'
      ? 'mdi-alert-outline'
      : 'mdi-information-outline'

const markRead = async (alert: IBellAlert) => {
  marking.value = alert._id
  try {
    await authFetch(`${API_BASE}/analytics/alerts/${alert._id}/read`, {
      method: 'PUT',
    })
    alert.read = true
    window.dispatchEvent(new CustomEvent('alerts:refresh'))
    open.value = false
    const target = alertTarget(alert)
    if (target) navigateTo(target)
  } catch {
    snackbar.error('No se pudo marcar la alerta como leída')
  } finally {
    marking.value = null
  }
}
</script>

<template>
  <v-menu v-model="open" :close-on-content-click="false" offset-y>
    <template #activator="{ props }">
      <v-btn v-bind="props" icon variant="text" title="Alertas">
        <v-badge
          :content="badgeLabel"
          :model-value="unreadCount > 0"
          color="error"
          offset-x="8"
          offset-y="8"
        >
          <v-icon>mdi-bell-outline</v-icon>
        </v-badge>
      </v-btn>
    </template>

    <v-card min-width="360" max-width="420">
      <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold">
        Alertas
        <v-spacer />
        <v-btn
          size="x-small"
          variant="text"
          prepend-icon="mdi-refresh"
          :loading="loading"
          @click="fetchAlerts()"
        >
          Actualizar
        </v-btn>
      </v-card-title>
      <v-divider />
      <v-list v-if="alerts.length" density="compact" max-height="380" class="overflow-y-auto">
        <v-list-item
          v-for="alert in alerts"
          :key="alert._id"
          :title="alert.message"
          :subtitle="`${employeeName(alert) || 'Sistema'} · ${formatDate(alert.createdAt, 'DD/MM HH:mm')}`"
          :prepend-icon="alertIcon(alert.type)"
          :color="alert.type === 'warning' || alert.type === 'overtime_limit' ? 'warning' : 'primary'"
          class="rounded-lg mb-1"
          :class="{ 'bg-grey-lighten-4': alert.read }"
          :loading="marking === alert._id"
          @click="markRead(alert)"
        >
          <template #append>
            <v-chip
              v-if="(alert.count ?? 1) > 1"
              size="x-small"
              color="primary"
              variant="tonal"
              class="mr-1"
            >
              {{ alert.count }}
            </v-chip>
            <v-icon size="small" class="text-medium-emphasis">
              mdi-chevron-right
            </v-icon>
          </template>
        </v-list-item>
      </v-list>
      <v-card-text v-else class="text-center text-medium-emphasis pa-6">
        <v-icon size="40" class="mb-2 text-medium-emphasis">mdi-bell-outline</v-icon>
        <div class="text-body-2">Sin alertas nuevas</div>
      </v-card-text>
    </v-card>
  </v-menu>
</template>
