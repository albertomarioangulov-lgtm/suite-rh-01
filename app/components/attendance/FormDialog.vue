<script setup lang="ts">
import type { IAttendanceRecord } from '~/composables/states/useAttendanceState'

const props = defineProps<{
  modelValue: boolean
  record?: IAttendanceRecord | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved', data: Record<string, unknown>): void
}>()

const formSaving = ref(false)

watch(
  () => props.modelValue,
  (open) => {
    if (open) formSaving.value = false
  },
)

const title = computed(() =>
  props.record ? 'Editar registro de asistencia' : 'Nuevo registro de asistencia',
)

const close = () => emit('update:modelValue', false)

const onSaved = (data: Record<string, unknown>) => {
  close()
  emit('saved', data)
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="640"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="position-relative">
      <v-progress-linear
        :indeterminate="formSaving"
        color="primary"
        height="4"
        class="position-absolute top-0 left-0 right-0"
        style="z-index: 1"
      />
      <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center ga-2">
        <v-icon color="primary">mdi-clock-in-outline</v-icon>
        {{ title }}
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" @click="close" />
      </v-card-title>
      <v-divider />
      <v-card-text class="pt-4">
        <AttendanceForm
          v-if="modelValue"
          :record="record"
          @saved="onSaved"
          @cancel="close"
          @saving-change="formSaving = $event"
        />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
