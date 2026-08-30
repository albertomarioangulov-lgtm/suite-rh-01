<script setup lang="ts">
import dayjs from 'dayjs'
import { getWeekRange } from '~~/shared/utils/datetime-helpers'
import type { IShiftView } from '~/composables/states/useShiftState'

const props = defineProps<{
  shifts: IShiftView[]
}>()

const emit = defineEmits<{
  (e: 'select', shiftId: string): void
}>()

/**
 * Convierte los turnos (plantilla por día de semana) en eventos de VCalendar
 * para la semana actual. Los rangos que cruzan medianoche terminan al día
 * siguiente.
 */
const events = computed(() => {
  const weekRange = getWeekRange()
  const weekStart = Array.isArray(weekRange) ? weekRange[0] : new Date()
  const result: Array<Record<string, unknown>> = []
  const shifts = Array.isArray(props.shifts) ? props.shifts : []

  for (let shiftIndex = 0; shiftIndex < shifts.length; shiftIndex++) {
    const shift = shifts[shiftIndex]
    const days = Array.isArray(shift.days) ? shift.days : []
    for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
      const day = days[dayIndex]
      if (day.active === false) continue
      const offset = day.dayOfWeek === 0 ? 6 : day.dayOfWeek - 1

      const ranges = Array.isArray(day.ranges) ? day.ranges : []
      for (let rangeIndex = 0; rangeIndex < ranges.length; rangeIndex++) {
        const range = ranges[rangeIndex]
        if (!range?.startTime || !range?.endTime) continue
        const [startHour, startMinute] = range.startTime.split(':').map(Number)
        const [endHour, endMinute] = range.endTime.split(':').map(Number)
        const dayDate = dayjs(weekStart).add(offset, 'day')
        const start = dayDate.hour(startHour).minute(startMinute)
        let end = dayDate.hour(endHour).minute(endMinute)
        if (end.isBefore(start)) end = end.add(1, 'day')

        result.push({
          start: start.toDate(),
          end: end.toDate(),
          name: shift.name,
          color: shift.color,
          timed: true,
          shiftId: shift._id,
        })
      }
    }
  }

  return result
})

const onEventClick = (payload: {
  event?: { input?: { shiftId?: string } }
}) => {
  const shiftId = payload.event?.input?.shiftId
  if (shiftId) emit('select', shiftId)
}
</script>

<template>
  <v-calendar
    :events="events"
    view="week"
    :weekdays="[1, 2, 3, 4, 5, 6, 0]"
    style="height: 560px"
    @click:event="onEventClick"
  >
    <template #event="{ event }">
      <div
        class="px-1 text-truncate text-caption"
        style="cursor: pointer"
        :title="event.name"
      >
        {{ event.name }}
      </div>
    </template>
  </v-calendar>
</template>
