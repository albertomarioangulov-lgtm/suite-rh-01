<script setup lang="ts">
import type { ICompanyView } from '~/composables/states/useCompanyState'
import {
  betweenRule,
  requiredRule,
  validMunicipalityCode,
  validNIT,
  validTime,
} from '~/utils/validation-rules'
import type { VForm } from 'vuetify/components'

const props = defineProps<{
  company?: ICompanyView | null
}>()

const emit = defineEmits<{
  (e: 'saved', data: Record<string, unknown>): void
  (e: 'cancel'): void
  (e: 'saving-change', value: boolean): void
}>()

const formState = reactive({
  name: props.company?.name ?? '',
  nit: props.company?.nit ?? '',
  logo: props.company?.logo ?? '',
  address: props.company?.address ?? '',
  municipalityCode: props.company?.municipalityCode ?? '',
  taxRegime: props.company?.taxRegime ?? 'simplified',
  maxWeeklyHours: props.company?.workSchedule.maxWeeklyHours ?? 42,
  minDailyHours: props.company?.workSchedule.minDailyHours ?? 6,
  maxDailyHours: props.company?.workSchedule.maxDailyHours ?? 9,
  nightShiftStart: props.company?.workSchedule.nightShiftStart ?? '19:00',
  nightShiftEnd: props.company?.workSchedule.nightShiftEnd ?? '06:00',
  employerPaidIncapacidadDays:
    props.company?.absencePolicies?.employerPaidIncapacidadDays ?? 2,
  restDaySurchargeOverride:
    props.company?.absencePolicies?.restDaySurchargeOverride ?? null,
  requireSupportDocument:
    props.company?.absencePolicies?.requireSupportDocument ?? false,
  permisoMedicoDays: props.company?.absencePolicies?.maxDaysPerYear?.Permiso_Medico ?? 5,
  calamidadDays: props.company?.absencePolicies?.maxDaysPerYear?.Calamidad_Domestica ?? 3,
  lutoDays: props.company?.absencePolicies?.maxDaysPerYear?.Luto ?? 5,
  matrimonioDays: props.company?.absencePolicies?.maxDaysPerYear?.Matrimonio ?? 5,
  sinRemunerarDays: props.company?.absencePolicies?.maxDaysPerYear?.Sin_Remunerar ?? 30,
})

const onLogoFile = (file: File | null) => {
  if (!file) return
  const reader = new FileReader()
  reader.onloadend = () => {
    formState.logo = String(reader.result ?? '')
  }
  reader.readAsDataURL(file)
}

const formRef = ref<InstanceType<typeof VForm> | null>(null)
const saving = ref(false)

watch(saving, (value) => emit('saving-change', value))
const error = ref('')

const regimeOptions = [
  { title: 'Simplificado', value: 'simplified' },
  { title: 'Común', value: 'common' },
]

const rules = {
  name: [requiredRule('Ingresa el nombre de la empresa')],
  nit: [requiredRule('Ingresa el NIT'), validNIT()],
  address: [requiredRule('Ingresa la dirección')],
  municipalityCode: [validMunicipalityCode()],
  maxWeeklyHours: [requiredRule('Ingresa las horas semanales'), betweenRule(1, 168)],
  minDailyHours: [requiredRule('Ingresa las horas mínimas'), betweenRule(1, 24)],
  maxDailyHours: [requiredRule('Ingresa las horas máximas'), betweenRule(1, 24)],
  nightShiftStart: [requiredRule('Ingresa la hora de inicio'), validTime()],
  nightShiftEnd: [requiredRule('Ingresa la hora de fin'), validTime()],
}

const save = async () => {
  const { valid } = (await formRef.value?.validate()) ?? { valid: true }
  if (!valid) return

  saving.value = true
  error.value = ''
  try {
    emit('saved', {
      name: formState.name.trim(),
      nit: formState.nit.trim(),
      logo: formState.logo,
      address: formState.address.trim(),
      municipalityCode: formState.municipalityCode.trim(),
      taxRegime: formState.taxRegime,
      workSchedule: {
        maxWeeklyHours: Number(formState.maxWeeklyHours),
        minDailyHours: Number(formState.minDailyHours),
        maxDailyHours: Number(formState.maxDailyHours),
        nightShiftStart: formState.nightShiftStart,
        nightShiftEnd: formState.nightShiftEnd,
      },
      absencePolicies: {
        employerPaidIncapacidadDays: Number(formState.employerPaidIncapacidadDays),
        restDaySurchargeOverride:
          formState.restDaySurchargeOverride === null ||
          formState.restDaySurchargeOverride === ''
            ? null
            : Number(formState.restDaySurchargeOverride),
        requireSupportDocument: formState.requireSupportDocument,
        maxDaysPerYear: {
          Permiso_Medico: Number(formState.permisoMedicoDays),
          Calamidad_Domestica: Number(formState.calamidadDays),
          Luto: Number(formState.lutoDays),
          Matrimonio: Number(formState.matrimonioDays),
          Sin_Remunerar: Number(formState.sinRemunerarDays),
        },
      },
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <v-form ref="formRef" @submit.prevent="save">
    <v-alert
      v-if="error"
      type="error"
      density="compact"
      variant="tonal"
      class="mb-3"
      :text="error"
      closable
      @click:close="error = ''"
    />

    <h2 class="text-subtitle-1 font-weight-bold mb-2">Datos de la empresa</h2>
    <v-row>
      <v-col cols="12" md="6">
        <v-text-field v-model="formState.name" label="Nombre" :rules="rules.name" class="mb-3" />
      </v-col>
      <v-col cols="12" md="6">
        <v-text-field v-model="formState.nit" label="NIT" :rules="rules.nit" class="mb-3" />
      </v-col>
      <v-col cols="12">
        <div class="d-flex align-center ga-3 mb-3">
          <img
            v-if="formState.logo"
            :src="formState.logo"
            alt="Logo"
            height="40"
            class="rounded"
            style="border: 1px solid rgba(15,23,42,0.1)"
          />
          <v-file-input
            label="Logo de la empresa"
            accept="image/*"
            density="comfortable"
            hide-details
            class="flex-grow-1"
            @change="onLogoFile($event?.target?.files?.[0] ?? null)"
          />
          <v-btn
            v-if="formState.logo"
            icon="mdi-close"
            size="small"
            variant="text"
            title="Quitar logo"
            @click="formState.logo = ''"
          />
        </div>
      </v-col>
      <v-col cols="12" md="6">
        <v-text-field
          v-model="formState.address"
          label="Dirección"
          :rules="rules.address"
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-text-field
          v-model="formState.municipalityCode"
          label="Código municipio (DIVIPOLA)"
          :rules="rules.municipalityCode"
          hint="5 dígitos, ej. 11001 (Bogotá)"
          persistent-hint
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-select
          v-model="formState.taxRegime"
          :items="regimeOptions"
          label="Régimen tributario"
          item-title="title"
          item-value="value"
          class="mb-3"
        />
      </v-col>
    </v-row>

    <h2 class="text-subtitle-1 font-weight-bold mb-2">Configuración de jornada</h2>
    <v-row>
      <v-col cols="12" sm="6" md="4">
        <v-text-field
          v-model="formState.maxWeeklyHours"
          label="Horas máximas semanales"
          type="number"
          :rules="rules.maxWeeklyHours"
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <v-text-field
          v-model="formState.minDailyHours"
          label="Horas mínimas diarias"
          type="number"
          :rules="rules.minDailyHours"
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <v-text-field
          v-model="formState.maxDailyHours"
          label="Horas máximas diarias"
          type="number"
          :rules="rules.maxDailyHours"
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6" md="6">
        <v-text-field
          v-model="formState.nightShiftStart"
          label="Inicio jornada nocturna"
          type="time"
          :rules="rules.nightShiftStart"
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6" md="6">
        <v-text-field
          v-model="formState.nightShiftEnd"
          label="Fin jornada nocturna"
          type="time"
          :rules="rules.nightShiftEnd"
          class="mb-3"
        />
      </v-col>
    </v-row>

    <h2 class="text-subtitle-1 font-weight-bold mb-2">
      Políticas de ausencias y licencias
    </h2>
    <v-row>
      <v-col cols="12" sm="6" md="4">
        <v-text-field
          v-model="formState.employerPaidIncapacidadDays"
          label="Días de incapacidad común pagados por la empresa"
          type="number"
          :rules="[betweenRule(0, 180)]"
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <v-text-field
          v-model="formState.restDaySurchargeOverride"
          label="Recargo día de descanso (override, 0-1)"
          type="number"
          step="0.05"
          :rules="[betweenRule(0, 2)]"
          class="mb-3"
          hint="Vacío = tabla legal (80/90/100%)"
          persistent-hint
        />
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <v-switch
          v-model="formState.requireSupportDocument"
          label="Exigir soporte documental"
          color="primary"
          inset
          class="mt-4"
        />
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <v-text-field
          v-model="formState.permisoMedicoDays"
          label="Permiso médico (días/año)"
          type="number"
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <v-text-field
          v-model="formState.calamidadDays"
          label="Calamidad doméstica (días/año)"
          type="number"
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <v-text-field
          v-model="formState.lutoDays"
          label="Luto (días/año)"
          type="number"
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <v-text-field
          v-model="formState.matrimonioDays"
          label="Matrimonio (días/año)"
          type="number"
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <v-text-field
          v-model="formState.sinRemunerarDays"
          label="Permiso sin remunerar (días/año)"
          type="number"
          class="mb-3"
        />
      </v-col>
    </v-row>

    <div class="d-flex justify-end ga-2">
      <v-btn variant="text" color="grey-darken-1" @click="emit('cancel')"> Cancelar </v-btn>
      <v-btn color="primary" variant="tonal" type="submit" :loading="saving" :disabled="saving">
        Guardar configuración
      </v-btn>
    </div>
  </v-form>
</template>
