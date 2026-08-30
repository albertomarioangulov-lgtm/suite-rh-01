<script setup lang="ts">
import { ROLES, type UserRole } from '~~/shared/auth'
import { formatDate } from '~~/shared/utils/datetime-helpers'

definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const shiftId = computed(() => String(route.params.id))
const tab = ref('details')

const { user: authUser } = useAuthState()
const snackbar = useSnackbarState()
const {
  currentShift,
  employeesByShift,
  shiftHistory,
  loading,
  error,
  fetchShiftById,
  updateShift,
  fetchEmployeesByShift,
  unassignShift,
  fetchShiftHistory,
} = useShiftState()

const role = computed(() => authUser.value?.role)
const canManage = computed(
  () =>
    !!role.value &&
    ([ROLES.ADMIN, ROLES.MANAGER, ROLES.HR] as UserRole[]).includes(role.value),
)

const editOpen = ref(false)
const assignOpen = ref(false)
const toggleOpen = ref(false)
const toggling = ref(false)

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const load = async () => {
  try {
    await fetchShiftById(shiftId.value)
    await fetchEmployeesByShift(shiftId.value)
    await fetchShiftHistory(shiftId.value)
  } catch {
    // Error visible en VAlert.
  }
}

watch(shiftId, load, { immediate: true })

const onSaved = async (data: Record<string, unknown>) => {
  try {
    await updateShift(shiftId.value, data)
    editOpen.value = false
    snackbar.success('Turno actualizado')
    await load()
  } catch {
    // Error visible en VAlert.
  }
}

const doToggle = async () => {
  if (!currentShift.value) return
  toggling.value = true
  try {
    await updateShift(shiftId.value, { active: !currentShift.value.active })
    toggleOpen.value = false
    snackbar.success(
      currentShift.value.active ? 'Turno desactivado' : 'Turno activado',
    )
    await load()
  } catch {
    // Error visible en VAlert.
  }
  toggling.value = false
}

const doUnassign = async (employeeId: string) => {
  try {
    await unassignShift(shiftId.value, [employeeId])
    snackbar.success('Empleado desasignado')
    await fetchEmployeesByShift(shiftId.value)
  } catch {
    // Error visible en VAlert.
  }
}

const actionMeta: Record<string, { icon: string; color: string; label: string }> = {
  create: { icon: 'mdi-plus-circle-outline', color: 'success', label: 'Creación' },
  update: { icon: 'mdi-pencil-outline', color: 'primary', label: 'Actualización' },
  assign: { icon: 'mdi-account-plus-outline', color: 'warning', label: 'Asignación' },
  unassign: { icon: 'mdi-account-minus-outline', color: 'grey', label: 'Desasignación' },
}

const historyMeta = (action: string) => actionMeta[action] ?? actionMeta.update
</script>

<template>
  <div>
    <div class="d-flex align-center ga-2 mb-3">
      <v-btn
        icon="mdi-arrow-left"
        variant="text"
        @click="navigateTo('/admin/shifts')"
      />
      <h1 class="text-h6 font-weight-bold mt-0 mb-0">
        {{ currentShift?.name ?? 'Detalle de turno' }}
      </h1>
      <v-spacer />
      <v-btn
        v-if="canManage && currentShift"
        variant="tonal"
        prepend-icon="mdi-pencil-outline"
        @click="editOpen = true"
      >
        Editar
      </v-btn>
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
      <v-tab value="details" prepend-icon="mdi-information-outline">
        Detalles
      </v-tab>
      <v-tab value="employees" prepend-icon="mdi-account-group-outline">
        Empleados
      </v-tab>
      <v-tab value="history" prepend-icon="mdi-history">
        Historial
      </v-tab>
    </v-tabs>

    <v-card v-if="currentShift && tab === 'details'" max-width="640" class="mx-auto">
      <v-card-item>
        <template #prepend>
          <ShiftBadge :name="currentShift.name" :color="currentShift.color" />
        </template>
        <v-card-subtitle>
          {{ currentShift.type === 'fixed' ? 'Fijo' : 'Rotativo' }}
          · {{ currentShift.active ? 'Activo' : 'Inactivo' }}
        </v-card-subtitle>
      </v-card-item>
      <v-divider />
      <v-list>
        <v-list-item
          v-for="day in currentShift.days"
          :key="day.dayOfWeek"
          :title="DAY_NAMES[day.dayOfWeek]"
          :subtitle="`${(day.ranges ?? [])
            .map((range) => `${range.startTime}–${range.endTime}`)
            .join(' · ')} (${(day.workHours ?? 0).toFixed(1)}h)`"
          prepend-icon="mdi-calendar-check-outline"
        />
        <v-list-item
          v-if="currentShift.description"
          title="Descripción"
          :subtitle="currentShift.description"
          prepend-icon="mdi-comment-outline"
        />
      </v-list>
      <v-card-actions class="pa-4">
        <v-btn
          v-if="canManage"
          variant="text"
          :color="currentShift.active ? 'warning' : 'success'"
          :prepend-icon="currentShift.active ? 'mdi-pause-circle-outline' : 'mdi-play-circle-outline'"
          @click="toggleOpen = true"
        >
          {{ currentShift.active ? 'Desactivar' : 'Activar' }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-card v-if="currentShift && tab === 'employees'">
      <v-card-item>
        <v-card-title class="text-subtitle-1 font-weight-bold">
          Empleados asignados
        </v-card-title>
        <template #append>
          <v-btn
            v-if="canManage"
            size="small"
            color="primary"
            variant="tonal"
            prepend-icon="mdi-account-plus-outline"
            @click="assignOpen = true"
          >
            Asignar
          </v-btn>
        </template>
      </v-card-item>
      <v-divider />
      <v-list v-if="employeesByShift.length">
        <v-list-item
          v-for="employee in employeesByShift"
          :key="employee._id"
          :title="`${employee.firstName} ${employee.lastName}`"
          :subtitle="employee.document"
        >
          <template #append>
            <v-btn
              v-if="canManage"
              icon="mdi-link-off"
              size="small"
              variant="text"
              title="Desasignar"
              @click="doUnassign(employee._id)"
            />
          </template>
        </v-list-item>
      </v-list>
      <v-card-text v-else class="text-medium-emphasis">
        Sin empleados asignados.
      </v-card-text>
    </v-card>

    <div v-if="tab === 'history'">
      <v-timeline v-if="shiftHistory.length" side="end" density="compact">
        <v-timeline-item
          v-for="log in shiftHistory"
          :key="log._id"
          :icon="historyMeta(log.action).icon"
          :color="historyMeta(log.action).color"
          fill-dot
        >
          <v-card>
            <v-card-text>
              <div class="d-flex align-center justify-space-between ga-2">
                <span class="font-weight-bold">
                  {{ historyMeta(log.action).label }}
                </span>
                <span class="text-body-2 text-medium-emphasis">
                  {{ formatDate(log.createdAt, 'DD/MM/YYYY HH:mm') }}
                </span>
              </div>
              <div class="text-body-2 mt-1">{{ log.description }}</div>
              <div class="text-caption text-medium-emphasis mt-1">
                Por {{ log.userName || '—' }}
              </div>
            </v-card-text>
          </v-card>
        </v-timeline-item>
      </v-timeline>
      <v-card v-else class="text-center pa-8">
        <p class="text-medium-emphasis">Aún no hay cambios registrados.</p>
      </v-card>
    </div>

    <v-card v-if="loading && !currentShift" max-width="640" class="mx-auto">
      <v-skeleton-loader type="list-item-two-line, divider, list-item-three-line" />
    </v-card>

    <ShiftFormDialog
      v-model="editOpen"
      :shift="currentShift"
      @saved="onSaved"
    />
    <ShiftAssignmentDialog
      v-model="assignOpen"
      :shift-id="shiftId"
      @changed="fetchEmployeesByShift(shiftId)"
    />

    <v-dialog v-model="toggleOpen" max-width="420" persistent>
      <v-card>
        <v-card-title class="text-subtitle-1">
          {{ currentShift?.active ? 'Desactivar turno' : 'Activar turno' }}
        </v-card-title>
        <v-card-text>
          ¿Seguro que quieres
          {{ currentShift?.active ? 'desactivar' : 'activar' }} el turno
          <strong>{{ currentShift?.name }}</strong>?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            color="grey-darken-1"
            @click="toggleOpen = false"
          >
            Cancelar
          </v-btn>
          <v-btn
            :color="currentShift?.active ? 'warning' : 'success'"
            variant="flat"
            :loading="toggling"
            :disabled="toggling"
            @click="doToggle"
          >
            Confirmar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
