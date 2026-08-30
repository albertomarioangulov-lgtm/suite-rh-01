<script setup lang="ts">
import { ROLES, type UserRole } from '~~/shared/auth'
import { ABSENCE_TYPE_LABELS, type AbsenceStatus } from '~~/shared/absence'
import type { IAbsenceView } from '~/composables/states/useAbsenceState'
import { formatDate } from '~~/shared/utils/datetime-helpers'
import { API_PATHS } from '~/utils/api-paths'
import dayjs from 'dayjs'

definePageMeta({
  middleware: 'auth',
})

const { user, authFetch } = useAuthState()
const { loading, error } = useAbsenceState()

const canView = computed(() => {
  const role = user.value?.role as UserRole | undefined
  return (
    !!role && ([ROLES.ADMIN, ROLES.MANAGER, ROLES.HR] as UserRole[]).includes(role)
  )
})

interface ICalendarEvent {
  name: string
  start: Date
  end: Date
  color: string
  record: IAbsenceView
}

const events = ref<ICalendarEvent[]>([])
const currentMonth = ref(dayjs().format('YYYY-MM'))

const statusColor: Record<AbsenceStatus, string> = {
  pending: 'orange',
  approved: 'green',
  rejected: 'red',
}

const loadEvents = async () => {
  if (!canView.value) return
  const [year, month] = currentMonth.value.split('-').map(Number)
  const from = dayjs(new Date(year, month - 1, 1)).format('YYYY-MM-DD')
  const to = dayjs(new Date(year, month, 0)).format('YYYY-MM-DD')
  try {
    const data = await authFetch<{ items: IAbsenceView[] }>(
      API_PATHS.absences.list,
      {
        query: {
          page: 1,
          limit: 100,
          dateFrom: from,
          dateTo: to,
        },
      },
    )
    events.value = data.items.map((record) => {
      const employee =
        typeof record.employee === 'object' && record.employee
          ? `${record.employee.firstName} ${record.employee.lastName}`
          : ''
      return {
        name: `${employee} · ${ABSENCE_TYPE_LABELS[record.type]}`,
        start: new Date(String(record.startDate).slice(0, 10) + 'T00:00:00'),
        end: new Date(String(record.endDate).slice(0, 10) + 'T23:59:59'),
        color: statusColor[record.status],
        record,
      }
    })
  } catch {
    // Error visible en el VAlert.
  }
}

watch(currentMonth, () => loadEvents())
onMounted(loadEvents)

const onMonthChange = (value: string | number | Date | null) => {
  const next = String(value)
  // Acepta tanto 'YYYY-MM' como 'YYYY-MM-DD' (lo que emite VCalendar).
  if (next.length >= 7) currentMonth.value = next.slice(0, 7)
}

const openRecord = (event: { event?: { input?: ICalendarEvent } }) => {
  const record = event.event?.input?.record
  if (record) navigateTo(`/admin/ausencias/${record._id}`)
}
</script>

<template>
  <div>
    <CommonPageHeader
      title="Calendario de ausencias"
      subtitle="Vista mensual de permisos, licencias e incapacidades"
    >
      <template #actions>
        <v-btn
          variant="text"
          color="grey-darken-1"
          prepend-icon="mdi-arrow-left"
          to="/admin/ausencias"
        >
          Volver
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
      text="No tienes permisos para ver el calendario de ausencias."
    />

    <v-card v-if="canView" :loading="loading">
      <v-card-text>
        <v-calendar
          v-model="currentMonth"
          type="month"
          :events="events"
          color="primary"
          @update:model-value="onMonthChange"
          @click:event="openRecord"
        />
      </v-card-text>
      <v-card-actions class="pt-0">
        <v-chip size="small" color="green" variant="tonal">Aprobado</v-chip>
        <v-chip size="small" color="orange" variant="tonal">Pendiente</v-chip>
        <v-chip size="small" color="red" variant="tonal">Rechazado</v-chip>
        <v-spacer />
        <span class="text-caption text-medium-emphasis">
          {{ formatDate(currentMonth, 'MMMM YYYY') }}
        </span>
      </v-card-actions>
    </v-card>
  </div>
</template>
