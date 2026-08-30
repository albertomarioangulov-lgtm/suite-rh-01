<script setup lang="ts">
import type { IAbsenceView } from '~/composables/states/useAbsenceState'

const props = defineProps<{
  modelValue: boolean
  record?: IAbsenceView | null
  initialEmployeeId?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved', data: Record<string, unknown>): void
}>()

const saving = ref(false)
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="680"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="position-relative">
      <v-progress-linear
        :indeterminate="saving"
        color="primary"
        height="4"
        class="position-absolute top-0 left-0 right-0"
        style="z-index: 1"
      />
      <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center ga-2">
        <v-icon color="primary">mdi-calendar-edit-outline</v-icon>
        {{ record ? 'Editar ausencia' : 'Registrar ausencia' }}
        <v-spacer />
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="emit('update:modelValue', false)"
        />
      </v-card-title>
      <v-divider />
      <v-card-text class="pt-4">
        <AbsenceForm
          v-if="modelValue"
          :absence="record"
          :initial-employee-id="initialEmployeeId"
          @saved="emit('saved', $event)"
          @cancel="emit('update:modelValue', false)"
          @saving-change="saving = $event"
        />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
