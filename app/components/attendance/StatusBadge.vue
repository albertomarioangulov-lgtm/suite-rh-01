<script setup lang="ts">
import type { AttendanceStatus } from '~/composables/states/useAttendanceState'

defineProps<{ status: AttendanceStatus | string }>()

const meta: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'warning' },
  approved: { label: 'Aprobado', color: 'success' },
  rejected: { label: 'Rechazado', color: 'error' },
}
</script>

<template>
  <v-chip size="small" variant="tonal" :color="meta[status]?.color ?? 'grey'">
    {{ meta[status]?.label ?? status }}
  </v-chip>
</template>
