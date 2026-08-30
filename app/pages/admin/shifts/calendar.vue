<script setup lang="ts">
import { ROLES, type UserRole } from '~~/shared/auth'

definePageMeta({
  middleware: 'auth',
})

const { user } = useAuthState()
const { shifts, loading, error, fetchShifts } = useShiftState()

const canView = computed(
  () =>
    !!user.value?.role &&
    ([ROLES.ADMIN, ROLES.MANAGER, ROLES.HR] as UserRole[]).includes(
      user.value.role,
    ),
)

onMounted(() => {
  if (canView.value) fetchShifts({ limit: 100, page: 1, active: 'true' })
})
</script>

<template>
  <div>
    <CommonPageHeader
      title="Calendario de turnos"
      subtitle="Distribución semanal por turno"
    />

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

    <v-card v-if="canView" :loading="loading">
      <ShiftCalendar
        :shifts="shifts"
        @select="(id) => navigateTo(`/admin/shifts/${id}`)"
      />
    </v-card>

    <v-alert
      v-else
      type="warning"
      variant="tonal"
      text="No tienes permisos para ver el calendario de turnos."
    />
  </div>
</template>
