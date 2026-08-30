<script setup lang="ts">
import { calculateHoursBetween } from '~~/shared/utils/datetime-helpers'
import type { IShiftDay } from '~/composables/states/useShiftState'

const props = defineProps<{
  days: IShiftDay[]
}>()

const hoursBetween = (start: string, end: string) => {
  const s = new Date(`2000-01-01T${start}`)
  const e = new Date(`2000-01-01T${end}`)
  let hours = calculateHoursBetween(s, e)
  if (hours < 0) hours += 24
  return Math.round(hours * 100) / 100
}

const dayHours = (day: { ranges?: Array<{ startTime: string; endTime: string }> }) =>
  Math.round(
    (day.ranges ?? []).reduce(
      (acc, range) => acc + Math.max(0, hoursBetween(range.startTime, range.endTime)),
      0,
    ) * 100,
  ) / 100

const weeklyHours = computed(() =>
  Math.round(
    props.days
      .filter((day) => day.active !== false)
      .reduce((acc, day) => acc + dayHours(day), 0) *
      100,
  ) / 100,
)

const valid = computed(() => weeklyHours.value <= 42)
</script>

<template>
  <div class="d-flex align-center ga-2">
    <span class="text-body-2">Total semanal:</span>
    <v-chip
      size="small"
      variant="tonal"
      :color="valid ? 'success' : 'error'"
    >
      {{ weeklyHours.toFixed(1) }}h / 42h
    </v-chip>
    <span v-if="!valid" class="text-body-2 text-error">
      Excede el máximo legal
    </span>
  </div>
</template>
