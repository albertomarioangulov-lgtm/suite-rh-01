<script setup lang="ts">
import { ABSENCE_STATUS_LABELS, type AbsenceStatus } from '~~/shared/absence'

defineProps<{ status: AbsenceStatus }>()
</script>

<template>
  <v-chip
    size="small"
    variant="tonal"
    :color="
      status === 'approved'
        ? 'success'
        : status === 'rejected'
          ? 'error'
          : 'warning'
    "
  >
    {{ ABSENCE_STATUS_LABELS[status] }}
  </v-chip>
</template>
