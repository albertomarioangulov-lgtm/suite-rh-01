<script setup lang="ts">
import type { IEmployeeView } from '~/composables/states/useEmployeeState'

const props = defineProps<{
  modelValue: boolean
  employee?: IEmployeeView | null
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
  props.employee
    ? `Editar: ${props.employee.firstName} ${props.employee.lastName}`
    : 'Nuevo empleado',
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
    max-width="680"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="position-relative">
      <v-progress-linear
        :indeterminate="formSaving"
        :color="employee ? '#E0E0E0' : '#90CAF9'"
        :bg-color="employee ? '#757575' : 'primary'"
        bg-opacity="1"
        height="4"
        class="position-absolute top-0 left-0 right-0"
        style="z-index: 1"
      />
      <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center ga-2">
        <v-icon color="primary">
          {{ employee ? 'mdi-account-edit-outline' : 'mdi-account-plus-outline' }}
        </v-icon>
        {{ title }}
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" @click="close" />
      </v-card-title>
      <v-divider />
      <v-card-text class="pt-4">
        <EmployeesForm
          v-if="modelValue"
          :employee="employee"
          @saved="onSaved"
          @cancel="close"
          @saving-change="formSaving = $event"
        />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
