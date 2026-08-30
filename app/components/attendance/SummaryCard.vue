<script setup lang="ts">
import type { IAttendanceSummary } from '~/composables/states/useAttendanceState'

defineProps<{
  title: string
  summary: IAttendanceSummary | null
}>()

const formatHours = (value?: number) => `${(value ?? 0).toFixed(1)} h`
</script>

<template>
  <v-card>
    <v-card-item>
      <v-card-title class="text-subtitle-1 font-weight-bold">
        {{ title }}
      </v-card-title>
    </v-card-item>
    <v-divider />
    <v-list v-if="summary">
      <v-list-item
        title="Horas trabajadas"
        :subtitle="formatHours(summary.hoursWorked)"
        prepend-icon="mdi-clock-outline"
      />
      <v-list-item
        title="Diurnas / Nocturnas"
        :subtitle="`${formatHours(summary.dayHours)} / ${formatHours(summary.nightHours)}`"
        prepend-icon="mdi-weather-sunny"
      />
      <v-list-item
        title="Extras diurnas / nocturnas"
        :subtitle="`${formatHours(summary.overtimeDayHours)} / ${formatHours(summary.overtimeNightHours)}`"
        prepend-icon="mdi-clock-alert-outline"
      />
      <v-list-item
        title="Recargo nocturno (35%)"
        :subtitle="formatHours(summary.nightSurcharge)"
        prepend-icon="mdi-weather-night"
      />
      <v-list-item
        title="Días registrados"
        :subtitle="String(summary.days)"
        prepend-icon="mdi-calendar-check-outline"
      />
    </v-list>
    <v-card-text v-else class="text-medium-emphasis">
      Sin datos para el período.
    </v-card-text>
  </v-card>
</template>
