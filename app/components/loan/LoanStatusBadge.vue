<script setup lang="ts">
import type { LoanStatus } from '~/composables/states/useLoanState'

defineProps<{ status: LoanStatus }>()

const labels: Record<LoanStatus, string> = {
  active: 'Activo',
  paid: 'Pagado',
  cancelled: 'Cancelado',
}
</script>

<template>
  <v-chip
    size="small"
    variant="tonal"
    :color="
      status === 'active' ? 'primary' : status === 'paid' ? 'success' : 'grey'
    "
  >
    {{ labels[status] }}
  </v-chip>
</template>
