<script setup lang="ts">
import { API_BASE } from '~/utils/api-paths'

export interface IDashboardAlert {
  _id: string
  employee?:
    | string
    | { _id: string; firstName: string; lastName: string; position?: string }
  module: string
  type: string
  message: string
  read: boolean
  createdAt?: string
}

const { authFetch } = useAuthState()

const alerts = useState<IDashboardAlert[]>('dash-alerts', () => [])
const loading = ref(false)
const liveConnected = ref(false)

const fetchAlerts = async () => {
  loading.value = true
  try {
    const data = await authFetch<{ items: IDashboardAlert[] }>(
      `${API_BASE}/analytics/alerts`,
    )
    alerts.value = data.items
  } catch {
    // Error silencioso: el dashboard muestra su propio VAlert.
  } finally {
    loading.value = false
  }
}

const alertTarget = (alert: IDashboardAlert) => {
  if (alert.module === 'payroll') return '/admin/payroll'
  const employee =
    typeof alert.employee === 'object' && alert.employee
      ? alert.employee._id
      : String(alert.employee ?? '')
  return employee ? `/admin/employees/${employee}` : '/admin/attendance'
}

const employeeName = (alert: IDashboardAlert) => {
  const employee = alert.employee
  if (typeof employee === 'object' && employee) {
    return `${employee.firstName} ${employee.lastName}`
  }
  return ''
}

const alertColor = (type: string) =>
  type === 'overtime_limit'
    ? 'error'
    : type === 'warning'
      ? 'warning'
      : 'info'

const alertIcon = (type: string) =>
  type === 'overtime_limit'
    ? 'mdi-clock-alert-outline'
    : type === 'warning'
      ? 'mdi-alert-outline'
      : 'mdi-information-outline'

let eventSource: EventSource | null = null

const connectLive = () => {
  if (eventSource || !import.meta.client) return
  eventSource = new EventSource('/api/events')

  eventSource.addEventListener('alert', (event: MessageEvent) => {
    try {
      const alert = JSON.parse(event.data) as IDashboardAlert
      alerts.value = [
        alert,
        ...alerts.value.filter((item) => item._id !== alert._id),
      ].slice(0, 50)
    } catch {
      // Payload inválido: se ignora.
    }
  })

  eventSource.onopen = () => {
    liveConnected.value = true
  }
  eventSource.onerror = () => {
    liveConnected.value = false
  }
}

onMounted(async () => {
  await fetchAlerts()
  connectLive()
  window.addEventListener('alerts:refresh', fetchAlerts)
})

onUnmounted(() => {
  eventSource?.close()
  eventSource = null
  window.removeEventListener('alerts:refresh', fetchAlerts)
})
</script>

<template>
  <div>
    <div class="d-flex align-center mb-2">
      <span class="text-caption text-medium-emphasis">
        {{ alerts.length }} alerta(s) activa(s)
      </span>
      <v-spacer />
      <v-chip
        size="x-small"
        :color="liveConnected ? 'success' : 'grey'"
        variant="tonal"
      >
        <v-icon size="x-small" class="mr-1">
          {{ liveConnected ? 'mdi-wifi' : 'mdi-wifi-off' }}
        </v-icon>
        {{ liveConnected ? 'En vivo' : 'Sin conexión' }}
      </v-chip>
    </div>

    <v-list v-if="alerts.length" density="compact" :loading="loading">
      <v-list-item
        v-for="alert in alerts"
        :key="alert._id"
        :to="alertTarget(alert)"
        :title="alert.message"
        :subtitle="
          alert.module === 'payroll'
            ? 'Nómina'
            : employeeName(alert) || 'Asistencia'
        "
        :prepend-icon="alertIcon(alert.type)"
        :color="alertColor(alert.type)"
        class="rounded-lg mb-1"
      >
        <template #append>
          <v-icon size="small" class="text-medium-emphasis">
            mdi-chevron-right
          </v-icon>
        </template>
      </v-list-item>
    </v-list>
    <v-card-text v-else class="text-medium-emphasis pa-2">
      Sin alertas activas. Las alertas aparecen aquí en tiempo real.
    </v-card-text>
  </div>
</template>
