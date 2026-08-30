<script setup lang="ts">
defineProps<{
  overtimeLimit?: {
    dailyOvertime?: number
    weeklyOvertime?: number
    dailyLimit?: number
    weeklyLimit?: number
    dailyExceeded?: boolean
    weeklyExceeded?: boolean
  } | null
}>()
</script>

<template>
  <v-alert
    v-if="overtimeLimit?.dailyExceeded || overtimeLimit?.weeklyExceeded"
    type="warning"
    variant="tonal"
    density="compact"
    class="mb-4"
    title="Límite de horas extras superado"
    :text="[
      overtimeLimit.dailyExceeded
        ? `Diario: ${overtimeLimit.dailyOvertime?.toFixed(1)}h de ${overtimeLimit.dailyLimit}h`
        : '',
      overtimeLimit.weeklyExceeded
        ? `Semanal: ${overtimeLimit.weeklyOvertime?.toFixed(1)}h de ${overtimeLimit.weeklyLimit}h`
        : '',
    ]
      .filter(Boolean)
      .join(' · ')"
  />
</template>
