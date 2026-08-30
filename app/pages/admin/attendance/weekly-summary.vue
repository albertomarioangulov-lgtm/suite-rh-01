<script setup lang="ts">
import { ROLES, type UserRole } from '~~/shared/auth'
import { formatDate } from '~~/shared/utils/datetime-helpers'
import { API_PATHS } from '~/utils/api-paths'

definePageMeta({
  middleware: 'auth',
})

const { user, authFetch } = useAuthState()
const { weeklySummary, loading, error, fetchWeeklySummary } =
  useAttendanceState()

const canView = computed(
  () =>
    !!user.value?.role &&
    ([ROLES.ADMIN, ROLES.MANAGER, ROLES.HR] as UserRole[]).includes(
      user.value.role,
    ),
)

const employees = ref<Array<{ title: string; value: string }>>([])
const employeeId = ref('')
const route = useRoute()
const overtimeLimit = ref<{
  dailyOvertime?: number
  weeklyOvertime?: number
  dailyLimit?: number
  weeklyLimit?: number
  dailyExceeded?: boolean
  weeklyExceeded?: boolean
} | null>(null)
const weekRange = ref<{ start?: string; end?: string }>({})

onMounted(async () => {
  if (!canView.value) return
  try {
    const data = await authFetch<{
      items: Array<{ _id: string; firstName: string; lastName: string; document: string }>
    }>(API_PATHS.employees.list, { query: { limit: 100, active: 'true' } })
    employees.value = data.items.map((employee) => ({
      title: `${employee.firstName} ${employee.lastName} (${employee.document})`,
      value: employee._id,
    }))
    if (route.query.employeeId) {
      employeeId.value = String(route.query.employeeId)
      await loadSummary()
    }
  } catch {
    // Error silencioso.
  }
})

const loadSummary = async () => {
  if (!employeeId.value) return
  try {
    const data = await authFetch<{
      weekStart: string
      weekEnd: string
      summary: typeof weeklySummary.value
      overtimeLimit: typeof overtimeLimit.value
    }>(API_PATHS.attendance.weekly(employeeId.value))
    await fetchWeeklySummary(employeeId.value)
    weekRange.value = {
      start: formatDate(data.weekStart, 'DD/MM/YYYY'),
      end: formatDate(data.weekEnd, 'DD/MM/YYYY'),
    }
    overtimeLimit.value = data.overtimeLimit
  } catch {
    // Error visible en VAlert.
  }
}
</script>

<template>
  <div>
    <CommonPageHeader
      title="Resumen semanal"
      subtitle="Horas trabajadas, extras y recargos por empleado"
    />

    <v-alert
      v-if="!canView"
      type="warning"
      variant="tonal"
      class="mb-4"
      text="No tienes permisos para ver los resúmenes."
    />

    <template v-else>
      <v-toolbar density="comfortable" class="mb-3 px-2">
        <v-autocomplete
          v-model="employeeId"
          :items="employees"
          label="Empleado"
          item-title="title"
          item-value="value"
          variant="solo"
          flat
          density="compact"
          hide-details
          class="flex-grow-1"
          style="max-width: 420px"
        />
        <v-spacer />
        <v-btn
          color="primary"
          variant="tonal"
          prepend-icon="mdi-magnify"
          :disabled="!employeeId"
          @click="loadSummary"
        >
          Consultar
        </v-btn>
      </v-toolbar>

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

      <AttendanceOvertimeAlert :overtime-limit="overtimeLimit" />

      <p v-if="weekRange.start" class="text-body-2 text-medium-emphasis mb-3">
        Semana: {{ weekRange.start }} – {{ weekRange.end }}
      </p>

      <v-skeleton-loader v-if="loading && !weeklySummary" type="article" />
      <AttendanceSummaryCard
        v-else
        title="Resumen semanal"
        :summary="weeklySummary"
      />
    </template>
  </div>
</template>
