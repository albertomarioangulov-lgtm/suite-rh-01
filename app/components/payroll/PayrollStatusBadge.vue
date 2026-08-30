<script setup lang="ts">
import type { PayrollStatus } from '~/composables/states/usePayrollState'

defineProps<{ status: PayrollStatus | string }>()

const meta: Record<string, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: 'warning' },
  approved: { label: 'Aprobada', color: 'success' },
  paid: { label: 'Pagada', color: 'primary' },
  cancelled: { label: 'Anulada', color: 'grey' },
}
</script>

<template>
  <v-chip size="small" variant="tonal" :color="meta[status]?.color ?? 'grey'">
    {{ meta[status]?.label ?? status }}
  </v-chip>
</template>
