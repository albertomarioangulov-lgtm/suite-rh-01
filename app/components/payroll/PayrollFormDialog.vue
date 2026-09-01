<script setup lang="ts">
import { requiredRule } from '~/utils/validation-rules'
import {
  getPayrollPeriodForDate,
  matchesPayrollPeriod,
  PAYROLL_FREQUENCIES,
  type PayrollFrequency,
} from '~~/shared/payroll-period'
import { API_PATHS } from '~/utils/api-paths'
import dayjs from 'dayjs'
import type { VForm } from 'vuetify/components'

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved', data: { periodStart: string; periodEnd: string }): void
}>()

const props = defineProps<{ modelValue: boolean }>()

const periodStart = ref('')
const periodEnd = ref('')
const formRef = ref<InstanceType<typeof VForm> | null>(null)
const frequency = ref<PayrollFrequency>('mensual')
const frequencyLoading = ref(false)
const cycles = ref<
  Array<{
    _id: string
    name: string
    frequency: PayrollFrequency
    isDefault?: boolean
    employeeCount?: number
  }>
>([])
const cycleId = ref('')
const cyclesLoading = ref(false)
const loading = computed(() => cyclesLoading.value || frequencyLoading.value)
const { authFetch } = useAuthState()

const rules = {
  periodStart: [requiredRule('Ingresa la fecha de inicio')],
  periodEnd: [requiredRule('Ingresa la fecha de fin')],
}

const frequencyLabel = computed(
  () => PAYROLL_FREQUENCIES[frequency.value]?.label ?? 'Manual',
)

const selectedCycle = computed(
  () => cycles.value.find((cycle) => cycle._id === cycleId.value) ?? null,
)

const suggestedPeriod = computed(() =>
  periodEnd.value && frequency.value
    ? getPayrollPeriodForDate(frequency.value, periodEnd.value)
    : null,
)

const periodMismatch = computed(() => {
  if (!periodStart.value || !periodEnd.value) return false
  return !matchesPayrollPeriod(frequency.value, {
    start: periodStart.value,
    end: periodEnd.value,
  })
})

const emptyCycleWarning = computed(
  () => selectedCycle.value?.employeeCount === 0,
)

const applySuggestion = (anchor: string) => {
  if (!frequency.value) return
  const period = getPayrollPeriodForDate(frequency.value, anchor)
  if (!period) return
  periodStart.value = period.start
  periodEnd.value = period.end
}

const onStartChange = (value: unknown) => {
  periodStart.value = value
    ? dayjs(value as Date | string).format('YYYY-MM-DD')
    : ''
}

const onEndChange = (value: unknown) => {
  periodEnd.value = value
    ? dayjs(value as Date | string).format('YYYY-MM-DD')
    : ''
}

watch(cycleId, () => {
  if (!selectedCycle.value) return
  frequency.value = selectedCycle.value.frequency
  if (periodEnd.value && !periodStart.value) applySuggestion(periodEnd.value)
})

watch(periodEnd, (value) => {
  // Si el usuario aún no fijó inicio, se completa con la regla de la frecuencia.
  if (value && !periodStart.value) applySuggestion(value)
})

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return
    periodStart.value = ''
    periodEnd.value = ''
    cycleId.value = ''
    frequencyLoading.value = true
    cyclesLoading.value = true
    try {
      const [cyclesData, company] = await Promise.all([
        authFetch<{ items: typeof cycles.value }>(
          API_PATHS.payrollCycles.list,
        ),
        authFetch<{ payrollFrequency?: PayrollFrequency }>(
          API_PATHS.company.config,
        ),
      ])
      cycles.value = cyclesData.items ?? []
      frequency.value = company.payrollFrequency ?? 'mensual'
    } catch {
      // Sin configuración: se usa mensual como regla por defecto.
      cycles.value = []
      frequency.value = 'mensual'
    } finally {
      frequencyLoading.value = false
      cyclesLoading.value = false
    }
    const defaultCycle =
      cycles.value.find((cycle) => cycle.isDefault) ?? cycles.value[0]
    cycleId.value = defaultCycle?._id ?? ''
    if (defaultCycle) frequency.value = defaultCycle.frequency
    // Sugerencia inicial: período que contiene la fecha actual.
    applySuggestion(new Date().toISOString().slice(0, 10))
  },
)

const submit = async () => {
  const { valid } = (await formRef.value?.validate()) ?? { valid: true }
  if (!valid || !periodStart.value || !periodEnd.value) return
  emit('saved', {
    periodStart: periodStart.value,
    periodEnd: periodEnd.value,
    cycleId: cycleId.value || undefined,
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
        v-if="loading"
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
          <v-select
            v-model="cycleId"
            :items="cycles.map((cycle) => ({
              title: cycle.name,
              value: cycle._id,
            }))"
            label="Ciclo de pago"
            :loading="cyclesLoading"
            class="mb-3"
            hint="Se liquidan los empleados asignados al ciclo"
            persistent-hint
          />
          <v-date-input
            :model-value="periodStart ? dayjs(periodStart).toDate() : null"
            label="Inicio del período"
            input-format="YYYY-MM-DD"
            clearable
            :rules="rules.periodStart"
            class="mb-3"
            @update:model-value="onStartChange"
          />
          <v-date-input
            :model-value="periodEnd ? dayjs(periodEnd).toDate() : null"
            label="Fin del período"
            input-format="YYYY-MM-DD"
            clearable
            :rules="rules.periodEnd"
            class="mb-3"
            @update:model-value="onEndChange"
          />
          <div class="d-flex align-center ga-2 mb-3">
            <v-chip
              size="small"
              variant="tonal"
              color="primary"
              :loading="frequencyLoading"
            >
              <v-icon start size="small">mdi-calendar-sync-outline</v-icon>
              Frecuencia: {{ frequencyLabel }}
            </v-chip>
            <v-chip
              v-if="selectedCycle?.employeeCount !== undefined"
              size="small"
              variant="tonal"
              color="info"
            >
              <v-icon start size="small">mdi-account-group-outline</v-icon>
              {{ selectedCycle.employeeCount }} empleado(s)
            </v-chip>
            <span
              v-if="suggestedPeriod"
              class="text-caption text-medium-emphasis"
            >
              Período sugerido: {{ suggestedPeriod.start }} al
              {{ suggestedPeriod.end }}
            </span>
          </div>
          <v-btn
            v-if="suggestedPeriod"
            variant="text"
            size="small"
            color="primary"
            prepend-icon="mdi-calendar-arrow-right"
            class="mb-3"
            @click="applySuggestion(periodEnd)"
          >
            Usar período sugerido
          </v-btn>
          <v-alert
            v-if="periodMismatch"
            type="warning"
            variant="tonal"
            density="compact"
            class="mb-3"
            text="El período no coincide con la frecuencia del ciclo. Solo continúa si es intencional (primer ciclo, período parcial o ajuste)."
          />
          <v-alert
            v-if="emptyCycleWarning"
            type="warning"
            variant="tonal"
            density="compact"
            class="mb-3"
            text="El ciclo no tiene empleados activos. La nómina se creará vacía y bloqueará este período para el ciclo hasta que la anules."
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
