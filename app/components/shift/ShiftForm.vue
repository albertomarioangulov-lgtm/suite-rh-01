<script setup lang="ts">
import { requiredRule } from '~/utils/validation-rules'
import type { IShiftView, ShiftType } from '~/composables/states/useShiftState'
import type { VForm } from 'vuetify/components'

const props = defineProps<{
  shift?: IShiftView | null
}>()

const emit = defineEmits<{
  (e: 'saved', data: Record<string, unknown>): void
  (e: 'cancel'): void
  (e: 'saving-change', value: boolean): void
}>()

const DAY_NAMES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
]

type Range = { startTime: string; endTime: string }

const cloneRanges = (ranges?: Range[]): Range[] =>
  (ranges ?? []).map((range) => ({ ...range }))

const step = ref(1)
const saving = ref(false)
watch(saving, (value) => emit('saving-change', value))

const formState = reactive({
  name: props.shift?.name ?? '',
  type: (props.shift?.type ?? 'fixed') as ShiftType,
  description: props.shift?.description ?? '',
  color: props.shift?.color ?? '#1867C0',
  fixedDays:
    (props.shift?.days ?? []).map((day) => day.dayOfWeek) ?? [1, 2, 3, 4, 5],
  fixedRanges: cloneRanges(props.shift?.days?.[0]?.ranges) ?? [
    { startTime: '08:00', endTime: '17:00' },
  ],
  rotatingDays: DAY_NAMES.map((_, index) => ({
    ranges:
      cloneRanges(props.shift?.days?.find((day) => day.dayOfWeek === index)?.ranges) ||
      [{ startTime: '08:00', endTime: '17:00' }],
  })),
})

if (formState.fixedRanges.length === 0) {
  formState.fixedRanges = [{ startTime: '08:00', endTime: '17:00' }]
}

const formRef = ref<InstanceType<typeof VForm> | null>(null)

const rules = {
  name: [requiredRule('Ingresa el nombre del turno')],
}

const addRange = (list: Range[]) => {
  list.push({ startTime: '', endTime: '' })
}

const removeRange = (list: Range[], index: number) => {
  list.splice(index, 1)
}

const copyDayFrom = (targetIndex: number, sourceIndex: number) => {
  if (targetIndex === sourceIndex) return
  formState.rotatingDays[targetIndex].ranges = cloneRanges(
    formState.rotatingDays[sourceIndex].ranges,
  )
}

const copySourceOptions = (dayIndex: number) =>
  DAY_NAMES.map((name, index) => ({ title: name, value: index })).filter(
    (option) => option.value !== dayIndex,
  )

const previewDays = computed<
  Array<{ dayOfWeek: number; ranges: Range[]; active: boolean }>
>(() => {
  if (formState.type === 'rotating') {
    return DAY_NAMES.map((_, index) => ({
      dayOfWeek: index,
      ranges: formState.rotatingDays[index].ranges,
      active: true,
    }))
  }
  return formState.fixedDays
    .map((day) => ({
      dayOfWeek: day,
      ranges: formState.fixedRanges.map((range) => ({ ...range })),
      active: true,
    }))
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
})

const incompleteDays = computed(() =>
  previewDays.value
    .filter(
      (day) =>
        day.ranges.length === 0 ||
        day.ranges.some((range) => !range.startTime || !range.endTime),
    )
    .map((day) => DAY_NAMES[day.dayOfWeek]),
)

const hasIncompleteRanges = computed(() => incompleteDays.value.length > 0)

const incompleteMessage = computed(() => {
  if (!hasIncompleteRanges.value) return ''
  const days = incompleteDays.value.join(', ')
  return formState.type === 'rotating'
    ? `El turno rotativo requiere los 7 días. Faltan por completar: ${days}`
    : `Completa los rangos de los días seleccionados: ${days}`
})

const save = async () => {
  const { valid } = (await formRef.value?.validate()) ?? { valid: true }
  if (!valid || hasIncompleteRanges.value) return
  if (formState.type === 'rotating' && previewDays.value.length !== 7) return

  saving.value = true
  try {
    emit('saved', {
      name: formState.name.trim(),
      type: formState.type,
      description: formState.description.trim() || undefined,
      color: formState.color,
      days: previewDays.value.map((day) => ({
        dayOfWeek: day.dayOfWeek,
        ranges: day.ranges.map((range) => ({ ...range })),
        active: day.active,
      })),
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <v-form ref="formRef" @submit.prevent="save">
    <v-stepper v-model="step">
      <v-stepper-header>
        <v-stepper-item :value="1" title="Datos generales" />
        <v-stepper-item :value="2" title="Horarios" />
      </v-stepper-header>

      <v-stepper-window>
        <v-stepper-window-item :value="1">
          <v-row class="pa-4">
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="formState.name"
                label="Nombre del turno"
                :rules="rules.name"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="formState.type"
                :items="[
                  { title: 'Fijo', value: 'fixed' },
                  { title: 'Rotativo', value: 'rotating' },
                ]"
                label="Tipo"
              />
            </v-col>
            <v-col cols="12" sm="8">
              <v-text-field
                v-model="formState.description"
                label="Descripción"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="formState.color"
                label="Color"
                type="color"
                hide-details
              />
            </v-col>
          </v-row>
        </v-stepper-window-item>

        <v-stepper-window-item :value="2">
          <div class="pa-4">
            <template v-if="formState.type === 'fixed'">
              <v-checkbox
                v-for="(name, index) in DAY_NAMES"
                :key="index"
                :model-value="formState.fixedDays.includes(index)"
                :label="name"
                @update:model-value="
                  (value) => {
                    if (value) formState.fixedDays.push(index)
                    else
                      formState.fixedDays = formState.fixedDays.filter(
                        (day) => day !== index,
                      )
                  }
                "
              />

              <div class="d-flex align-center mb-2">
                <h3 class="text-subtitle-2 font-weight-bold">
                  Rangos de tiempo (aplica a los días seleccionados)
                </h3>
                <v-spacer />
                <v-btn
                  size="small"
                  color="primary"
                  variant="tonal"
                  prepend-icon="mdi-plus"
                  @click="addRange(formState.fixedRanges)"
                >
                  Añadir rango
                </v-btn>
              </div>
              <v-row
                v-for="(range, index) in formState.fixedRanges"
                :key="index"
                align="center"
              >
                <v-col cols="4">
                  <v-text-field
                    v-model="range.startTime"
                    label="Inicio"
                    type="time"
                    hide-details
                  />
                </v-col>
                <v-col cols="4">
                  <v-text-field
                    v-model="range.endTime"
                    label="Fin"
                    type="time"
                    hide-details
                  />
                </v-col>
                <v-col cols="4" class="d-flex justify-end">
                  <v-btn
                    icon="mdi-delete-outline"
                    size="small"
                    variant="text"
                    color="error"
                    :disabled="formState.fixedRanges.length === 1"
                    @click="removeRange(formState.fixedRanges, index)"
                  />
                </v-col>
              </v-row>
            </template>

            <template v-else>
              <div
                v-for="(day, dayIndex) in formState.rotatingDays"
                :key="dayIndex"
                class="mb-4"
              >
                <div class="d-flex align-center mb-1">
                  <span class="text-body-2 font-weight-medium">
                    {{ DAY_NAMES[dayIndex] }}
                  </span>
                  <v-spacer />
                  <v-select
                    :model-value="''"
                    :items="copySourceOptions(dayIndex)"
                    label="Copiar desde"
                    variant="outlined"
                    density="compact"
                    hide-details
                    class="mx-2"
                    style="max-width: 170px"
                    @update:model-value="
                      (source) => copyDayFrom(dayIndex, Number(source))
                    "
                  />
                  <v-btn
                    size="small"
                    variant="text"
                    prepend-icon="mdi-content-copy"
                    title="Copiar día anterior"
                    :disabled="dayIndex === 0"
                    @click="copyDayFrom(dayIndex, dayIndex - 1)"
                  >
                    Día anterior
                  </v-btn>
                  <v-btn
                    size="x-small"
                    variant="text"
                    prepend-icon="mdi-plus"
                    @click="addRange(day.ranges)"
                  >
                    Rango
                  </v-btn>
                </div>
                <v-row
                  v-for="(range, index) in day.ranges"
                  :key="index"
                  align="center"
                >
                  <v-col cols="4">
                    <v-text-field
                      v-model="range.startTime"
                      label="Inicio"
                      type="time"
                      hide-details
                    />
                  </v-col>
                  <v-col cols="4">
                    <v-text-field
                      v-model="range.endTime"
                      label="Fin"
                      type="time"
                      hide-details
                    />
                  </v-col>
                  <v-col cols="4" class="d-flex justify-end">
                    <v-btn
                      icon="mdi-delete-outline"
                      size="small"
                      variant="text"
                      color="error"
                      :disabled="day.ranges.length === 1"
                      @click="removeRange(day.ranges, index)"
                    />
                  </v-col>
                </v-row>
              </div>
            </template>

            <v-alert
              v-if="hasIncompleteRanges"
              type="warning"
              variant="tonal"
              density="compact"
              class="mt-2"
              :text="incompleteMessage"
            />

            <div class="mt-3">
              <ShiftWeeklyHoursSummary :days="previewDays" />
            </div>
          </div>
        </v-stepper-window-item>
      </v-stepper-window>
    </v-stepper>

    <div class="d-flex justify-end ga-2 mt-4">
      <v-btn variant="text" color="grey-darken-1" @click="emit('cancel')">
        Cancelar
      </v-btn>
      <v-btn v-if="step > 1" variant="text" @click="step--">Anterior</v-btn>
      <v-btn v-if="step < 2" color="primary" variant="tonal" @click="step++">
        Siguiente
      </v-btn>
      <v-btn
        v-else
        color="primary"
        variant="tonal"
        type="submit"
        :loading="saving"
        :disabled="saving || hasIncompleteRanges"
      >
        {{ props.shift ? 'Guardar cambios' : 'Crear turno' }}
      </v-btn>
    </div>
  </v-form>
</template>
