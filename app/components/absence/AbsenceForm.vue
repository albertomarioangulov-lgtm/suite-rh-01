<script setup lang="ts">
import { ref } from 'vue'
import {
  ABSENCE_STATUS,
  ABSENCE_TYPE_LIST,
  ABSENCE_TYPE_LABELS,
  type AbsenceType,
} from '~~/shared/absence'
import { requiredRule } from '~/utils/validation-rules'
import { API_PATHS } from '~/utils/api-paths'
import type { IAbsenceView } from '~/composables/states/useAbsenceState'
import type { VForm } from 'vuetify/components'

const props = defineProps<{
  absence?: IAbsenceView | null
  /** Al crear, fija y bloquea el empleado (ej. desde la ficha del empleado). */
  initialEmployeeId?: string
}>()

const emit = defineEmits<{
  (e: 'saved', data: Record<string, unknown>): void
  (e: 'cancel'): void
  (e: 'saving-change', value: boolean): void
}>()

const isNew = computed(() => !props.absence)
const { authFetch } = useAuthState()

const employeeId = computed(() => {
  const employee = props.absence?.employee
  if (typeof employee === 'object' && employee) return employee._id
  return typeof employee === 'string' ? employee : ''
})

const formState = reactive({
  employeeId: props.initialEmployeeId || employeeId.value,
  type: (props.absence?.type ?? 'Permiso_Medico') as AbsenceType,
  startDate: props.absence?.startDate
    ? String(props.absence.startDate).slice(0, 10)
    : '',
  endDate: props.absence?.endDate
    ? String(props.absence.endDate).slice(0, 10)
    : '',
  scheduledRestDate: props.absence?.scheduledRestDate
    ? String(props.absence.scheduledRestDate).slice(0, 10)
    : '',
  supportDocument: props.absence?.supportDocument ?? '',
  observations: props.absence?.observations ?? '',
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
    // Error silencioso: el select queda vacío.
  } finally {
    loadingEmployees.value = false
  }
})

const typeOptions = ABSENCE_TYPE_LIST.map((type) => ({
  title: ABSENCE_TYPE_LABELS[type],
  value: type,
}))

const isDescanso = computed(
  () => formState.type === 'Descanso_Compensatorio',
)
const lockEmployee = computed(() => !!props.initialEmployeeId)

const rules = {
  employeeId: [requiredRule('Selecciona el empleado')],
  type: [requiredRule('Selecciona el tipo de ausencia')],
  startDate: [requiredRule('Ingresa la fecha de inicio')],
  endDate: [requiredRule('Ingresa la fecha de fin')],
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
      type: formState.type,
      startDate: formState.startDate,
      endDate: formState.endDate,
      scheduledRestDate: isDescanso.value
        ? formState.scheduledRestDate || formState.startDate
        : null,
      supportDocument: formState.supportDocument.trim() || undefined,
      observations: formState.observations.trim() || undefined,
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
          :disabled="!isNew || lockEmployee"
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-select
          v-model="formState.type"
          :items="typeOptions"
          label="Tipo de ausencia"
          :rules="rules.type"
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
      <v-col cols="12" sm="6">
        <v-text-field
          v-model="formState.endDate"
          label="Fecha de fin"
          type="date"
          :rules="rules.endDate"
          class="mb-3"
        />
      </v-col>
      <v-col v-if="isDescanso" cols="12" sm="6">
        <v-text-field
          v-model="formState.scheduledRestDate"
          label="Fecha programada del descanso"
          type="date"
          class="mb-3"
          hint="Se usa para calcular el recargo por el día de descanso trabajado."
          persistent-hint
        />
      </v-col>
      <v-col cols="12">
        <v-text-field
          v-model="formState.supportDocument"
          label="Soporte (URL o referencia)"
          class="mb-3"
        />
      </v-col>
      <v-col cols="12">
        <v-textarea
          v-model="formState.observations"
          label="Observaciones"
          rows="2"
          class="mb-3"
        />
      </v-col>
    </v-row>

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
        {{ isNew ? 'Registrar ausencia' : 'Guardar cambios' }}
      </v-btn>
    </div>
  </v-form>
</template>
