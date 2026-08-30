<script setup lang="ts">
import { requiredRule, betweenRule } from '~/utils/validation-rules'
import { API_PATHS } from '~/utils/api-paths'
import type { VForm } from 'vuetify/components'

const emit = defineEmits<{
  (e: 'saved', data: Record<string, unknown>): void
  (e: 'cancel'): void
  (e: 'saving-change', value: boolean): void
}>()

const { authFetch } = useAuthState()

const formState = reactive({
  employeeId: '',
  description: '',
  principal: 0,
  interestRate: 0,
  termMonths: 12,
  startDate: '',
})

const employeeOptions = ref<Array<{ title: string; value: string }>>([])
const loadingEmployees = ref(false)

onMounted(async () => {
  loadingEmployees.value = true
  try {
    const data = await authFetch<{
      items: Array<{ _id: string; firstName: string; lastName: string; document: string }>
    }>(API_PATHS.employees.list, { query: { limit: 100, active: 'true' } })
    employeeOptions.value = data.items.map((employee) => ({
      title: `${employee.firstName} ${employee.lastName} (${employee.document})`,
      value: employee._id,
    }))
  } catch {
    // Select vacío.
  } finally {
    loadingEmployees.value = false
  }
})

const rules = {
  employeeId: [requiredRule('Selecciona el empleado')],
  principal: [requiredRule('Ingresa el capital'), betweenRule(1, 1000000000)],
  interestRate: [betweenRule(0, 100)],
  termMonths: [requiredRule('Ingresa el número de cuotas'), betweenRule(1, 120)],
  startDate: [requiredRule('Ingresa la fecha de inicio')],
}

const formRef = ref<InstanceType<typeof VForm> | null>(null)
const saving = ref(false)

watch(saving, (value) => emit('saving-change', value))

const save = async () => {
  const { valid } = (await formRef.value?.validate()) ?? { valid: true }
  if (!valid) return
  saving.value = true
  try {
    emit('saved', {
      employeeId: formState.employeeId,
      description: formState.description.trim() || undefined,
      principal: Number(formState.principal),
      interestRate: Number(formState.interestRate) / 100,
      termMonths: Number(formState.termMonths),
      startDate: formState.startDate,
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <v-form ref="formRef" @submit.prevent="save">
    <v-row>
      <v-col cols="12" sm="6">
        <v-autocomplete
          v-model="formState.employeeId"
          :items="employeeOptions"
          label="Empleado"
          item-title="title"
          item-value="value"
          :rules="rules.employeeId"
          :loading="loadingEmployees"
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field
          v-model="formState.description"
          label="Descripción (ej. Computador portátil)"
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field
          v-model="formState.principal"
          label="Capital del préstamo ($)"
          type="number"
          :rules="rules.principal"
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field
          v-model="formState.termMonths"
          label="Número de cuotas (meses)"
          type="number"
          :rules="rules.termMonths"
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field
          v-model="formState.interestRate"
          label="Interés mensual (%)"
          type="number"
          :rules="rules.interestRate"
          hint="0 = sin interés (capital ÷ cuotas)"
          persistent-hint
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field
          v-model="formState.startDate"
          label="Fecha de inicio"
          type="date"
          :rules="rules.startDate"
          class="mb-3"
        />
      </v-col>
    </v-row>

    <div class="d-flex justify-end ga-2">
      <v-btn variant="text" color="grey-darken-1" @click="emit('cancel')">
        Cancelar
      </v-btn>
      <v-btn color="primary" variant="tonal" type="submit" :loading="saving">
        Crear préstamo
      </v-btn>
    </div>
  </v-form>
</template>
