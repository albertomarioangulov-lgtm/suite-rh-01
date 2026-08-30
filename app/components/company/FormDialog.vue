<script setup lang="ts">
import type { ICompanyView } from '~/composables/states/useCompanyState'

const props = defineProps<{
  modelValue: boolean
  company?: ICompanyView | null
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
  props.company ? 'Editar configuración' : 'Registrar empresa',
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
    max-width="720"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="position-relative">
      <v-progress-linear
        :indeterminate="formSaving"
        :color="company ? '#E0E0E0' : '#90CAF9'"
        :bg-color="company ? '#757575' : 'primary'"
        bg-opacity="1"
        height="4"
        class="position-absolute top-0 left-0 right-0"
        style="z-index: 1"
      />
      <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center ga-2">
        <v-icon color="primary">mdi-office-building-outline</v-icon>
        {{ title }}
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" @click="close" />
      </v-card-title>
      <v-divider />
      <v-card-text class="pt-4">
        <CompanyForm
          v-if="modelValue"
          :company="company"
          @saved="onSaved"
          @cancel="close"
          @saving-change="formSaving = $event"
        />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
