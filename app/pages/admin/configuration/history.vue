<script setup lang="ts">
import { ROLES, type UserRole } from '~~/shared/auth'
import { formatDate } from '~~/shared/utils/datetime-helpers'

definePageMeta({
  middleware: 'auth',
})

const { user } = useAuthState()
const { auditLogs, loading, error, fetchAuditLogs } = useCompanyState()

const canView = computed(
  () => !!user.value && ([ROLES.ADMIN, ROLES.MANAGER] as UserRole[]).includes(user.value.role),
)

onMounted(() => {
  if (canView.value) fetchAuditLogs()
})

const actionMeta: Record<string, { icon: string; color: string; label: string }> = {
  create: { icon: 'mdi-plus-circle-outline', color: 'success', label: 'Creación' },
  update: { icon: 'mdi-pencil-outline', color: 'primary', label: 'Actualización' },
  activate: { icon: 'mdi-play-circle-outline', color: 'warning', label: 'Activación' },
  delete: { icon: 'mdi-delete-outline', color: 'error', label: 'Eliminación' },
  assign: { icon: 'mdi-account-plus-outline', color: 'success', label: 'Asignación' },
  unassign: { icon: 'mdi-account-minus-outline', color: 'warning', label: 'Desasignación' },
  move: { icon: 'mdi-swap-horizontal', color: 'info', label: 'Movimiento de ciclo' },
  generate: { icon: 'mdi-auto-fix', color: 'purple', label: 'Generación' },
  approve: { icon: 'mdi-check-circle-outline', color: 'success', label: 'Aprobación' },
  pay: { icon: 'mdi-cash', color: 'primary', label: 'Pago' },
  cancel: { icon: 'mdi-cancel', color: 'error', label: 'Anulación' },
  recalculate: { icon: 'mdi-refresh', color: 'warning', label: 'Recálculo' },
}

const meta = (action: string) =>
  actionMeta[action] ?? {
    icon: 'mdi-pencil-outline',
    color: 'primary',
    label: 'Actualización',
  }
</script>

<template>
  <div>
    <CommonPageHeader
      title="Historial de cambios"
      subtitle="Auditoría de la configuración: empresa, parámetros legales, ciclos y conceptos de nómina"
    />

    <CommonConfigurationTabs />

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
      text="No tienes permisos para ver el historial de cambios."
    />

    <div v-else-if="loading" class="d-flex justify-center py-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <v-timeline v-else-if="auditLogs.length" side="end" density="compact">
      <v-timeline-item
        v-for="log in auditLogs"
        :key="log._id"
        :icon="meta(log.action).icon"
        :color="meta(log.action).color"
        fill-dot
      >
        <v-card>
          <v-card-text>
            <div class="d-flex align-center justify-space-between ga-2">
              <span class="font-weight-bold">
                {{ meta(log.action).label }}
              </span>
              <span class="text-body-2 text-medium-emphasis text-no-wrap">
                {{ formatDate(log.createdAt, 'DD/MM/YYYY HH:mm') }}
              </span>
            </div>
            <div class="text-body-2 mt-1">
              {{ log.description }}
            </div>
            <div class="text-caption text-medium-emphasis mt-1">Por {{ log.userName || '—' }}</div>
          </v-card-text>
        </v-card>
      </v-timeline-item>
    </v-timeline>

    <v-card v-else class="text-center pa-8">
      <v-icon size="48" color="grey-lighten-1" class="mb-3"> mdi-history </v-icon>
      <p class="text-medium-emphasis">Aún no hay cambios registrados.</p>
    </v-card>
  </div>
</template>
