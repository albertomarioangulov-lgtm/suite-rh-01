<script setup lang="ts">
import { requiredRule } from '~/utils/validation-rules'
import { API_PATHS } from '~/utils/api-paths'
import {
  calculateHoursBetween,
  splitDayNightHours,
  splitOvertimeFromEnd,
} from '~~/shared/utils/datetime-helpers'
import type { VForm } from 'vuetify/components'

const props = defineProps<{
  record?: {
    employee?:
      | string
      | { _id: string; firstName: string; lastName: string; document: string }
    clockIn?: string
    clockOut?: string
    observations?: string
  } | null
}>()

const emit = defineEmits<{
  (e: 'saved', data: Record<string, unknown>): void
  (e: 'cancel'): void
  (e: 'saving-change', value: boolean): void
}>()

const { authFetch } = useAuthState()

const recordEmployeeId =
  typeof props.record?.employee === 'object' && props.record.employee
    ? props.record.employee._id
    : typeof props.record?.employee === 'string'
      ? props.record.employee
      : ''

const formState = reactive({
  employeeId: recordEmployeeId,
  date: props.record?.clockIn ? String(props.record.clockIn).slice(0, 10) : '',
  clockIn: props.record?.clockIn ? String(props.record.clockIn).slice(11, 16) : '',
  clockOut: props.record?.clockOut ? String(props.record.clockOut).slice(11, 16) : '',
  observations: props.record?.observations ?? '',
})

const employeeOptions = ref<Array<{ title: string; value: string }>>([])
const loadingEmployees = ref(false)

onMounted(async () => {
  loadingEmployees.value = true
  try {
    const data = await authFetch<{
      items: Array<{
        _id: string
        firstName: string
        lastName: string
        document: string
        assignedShift?: string | null
      }>
    }>(API_PATHS.employees.list, { query: { limit: 100, active: 'true' } })
    employeeOptions.value = data.items
      // Solo empleados con turno asignado (patrón del módulo de asistencia).
      .filter((employee) => !!employee.assignedShift)
      .map((employee) => ({
        title: `${employee.firstName} ${employee.lastName} (${employee.document})`,
        value: employee._id,
      }))
  } catch {
    // Error silencioso.
  } finally {
    loadingEmployees.value = false
  }
})

const formRef = ref<InstanceType<typeof VForm> | null>(null)
const saving = ref(false)
watch(saving, (value) => emit('saving-change', value))

const rules = {
  employeeId: [requiredRule('Selecciona el empleado')],
  clockIn: [requiredRule('Ingresa la hora de entrada')],
  clockOut: [requiredRule('Ingresa la hora de salida')],
}

const preview = computed(() => {
  if (!formState.clockIn || !formState.clockOut) return null
  const start = new Date(formState.clockIn)
  const end = new Date(formState.clockOut)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return null
  }
  const total = calculateHoursBetween(start, end)
  const { dayHours, nightHours } = splitDayNightHours(start, end)
  const { overtimeDayHours, overtimeNightHours } = splitOvertimeFromEnd(start, end, 8)
  return { total, dayHours, nightHours, overtimeDayHours, overtimeNightHours }
})

const save = async () => {
  const { valid } = (await formRef.value?.validate()) ?? { valid: true }
  if (!valid || !preview.value) return

  saving.value = true
  try {
    const clockIn = formState.date
      ? `${formState.date}T${formState.clockIn || '00:00'}`
      : formState.clockIn
    const clockOut = formState.date
      ? `${formState.date}T${formState.clockOut || '00:00'}`
      : formState.clockOut
    emit('saved', {
      employeeId: formState.employeeId,
      clockIn,
      clockOut,
      observations: formState.observations.trim() || undefined,
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <v-form ref="formRef" @submit.prevent="save">
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

    <v-row>
      <v-col cols="12" sm="6">
        <v-text-field
          v-model="formState.date"
          label="Fecha"
          type="date"
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6" />
      <v-col cols="12" sm="6">
        <v-text-field
          v-model="formState.clockIn"
          label="Entrada (HH:mm)"
          type="time"
          :rules="rules.clockIn"
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field
          v-model="formState.clockOut"
          label="Salida (HH:mm)"
          type="time"
          :rules="rules.clockOut"
          class="mb-3"
        />
      </v-col>
    </v-row>

    <v-alert
      v-if="preview"
      type="info"
      variant="tonal"
      density="compact"
      class="mb-3"
      :text="`Total ${preview.total.toFixed(1)}h · Diurnas ${preview.dayHours.toFixed(1)}h · Nocturnas ${preview.nightHours.toFixed(1)}h · Extras D ${preview.overtimeDayHours.toFixed(1)}h · Extras N ${preview.overtimeNightHours.toFixed(1)}h`"
    />
    <v-alert
      v-else-if="formState.clockIn && formState.clockOut"
      type="warning"
      variant="tonal"
      density="compact"
      class="mb-3"
      text="La salida debe ser posterior a la entrada."
    />

    <v-textarea
      v-model="formState.observations"
      label="Observaciones"
      rows="2"
      class="mb-3"
    />

    <div class="d-flex justify-end ga-2">
      <v-btn variant="text" color="grey-darken-1" @click="emit('cancel')">
        Cancelar
      </v-btn>
      <v-btn
        color="primary"
        variant="tonal"
        type="submit"
        :loading="saving"
        :disabled="saving"
      >
        Guardar
      </v-btn>
    </div>
  </v-form>
</template>
