<script setup lang="ts">
import { requiredRule } from '~/utils/validation-rules'
import type { VForm } from 'vuetify/components'

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved', data: { periodStart: string; periodEnd: string }): void
}>()

defineProps<{ modelValue: boolean }>()

const periodStart = ref('')
const periodEnd = ref('')
const formRef = ref<InstanceType<typeof VForm> | null>(null)

const rules = {
  periodStart: [requiredRule('Ingresa la fecha de inicio')],
  periodEnd: [requiredRule('Ingresa la fecha de fin')],
}

const submit = async () => {
  const { valid } = (await formRef.value?.validate()) ?? { valid: true }
  if (!valid || !periodStart.value || !periodEnd.value) return
  emit('saved', {
    periodStart: periodStart.value,
    periodEnd: periodEnd.value,
  })
  emit('update:modelValue', false)
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="480"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="position-relative">
      <v-progress-linear
        indeterminate
        color="primary"
        height="4"
        class="position-absolute top-0 left-0 right-0"
        style="z-index: 1"
      />
      <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center ga-2">
        <v-icon color="primary">mdi-cash-plus</v-icon>
        Nueva nómina
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
        <v-form ref="formRef" @submit.prevent="submit">
          <v-text-field
            v-model="periodStart"
            label="Inicio del período"
            type="date"
            :rules="rules.periodStart"
            class="mb-3"
          />
          <v-text-field
            v-model="periodEnd"
            label="Fin del período"
            type="date"
            :rules="rules.periodEnd"
            class="mb-3"
          />
          <div class="d-flex justify-end ga-2">
            <v-btn
              variant="text"
              color="grey-darken-1"
              @click="emit('update:modelValue', false)"
            >
              Cancelar
            </v-btn>
            <v-btn color="primary" variant="tonal" type="submit">
              Crear y calcular
            </v-btn>
          </div>
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
