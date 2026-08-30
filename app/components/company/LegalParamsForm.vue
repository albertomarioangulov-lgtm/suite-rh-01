<script setup lang="ts">
import { betweenRule, requiredRule } from '~/utils/validation-rules'
import type { VForm } from 'vuetify/components'

const emit = defineEmits<{
  (e: 'saved', data: Record<string, unknown>): void
  (e: 'cancel'): void
  (e: 'saving-change', value: boolean): void
}>()

const step = ref(1)
const formRef = ref<InstanceType<typeof VForm> | null>(null)
const saving = ref(false)

watch(saving, (value) => emit('saving-change', value))
const error = ref('')

const formState = reactive({
  uvtValue: 0,
  minimumWage: 0,
  transportAllowance: 0,
  arlRiskClass: 1,
  validFrom: '',
  healthEmployee: 4,
  healthEmployer: 8.5,
  pensionEmployee: 4,
  pensionEmployer: 12,
  nightSurcharge: 35,
  extraDay: 25,
  extraNight: 75,
  arlRate1: 0.522,
  arlRate2: 1.044,
  arlRate3: 2.436,
  arlRate4: 4.35,
  arlRate5: 6.96,
  sena: 2,
  icbf: 3,
  compensationFund: 4,
  incapacidadPercent: 66.67,
  employerPaidIncapacidadDays: 2,
  baseHoursPerMonth: 240,
  withholdingRates: [] as Array<{ from: number; to: number; percentage: number }>,
})

const rules = {
  uvtValue: [requiredRule('Ingresa el valor UVT'), betweenRule(1, 10000000)],
  minimumWage: [
    requiredRule('Ingresa el salario mínimo'),
    betweenRule(1, 100000000),
  ],
  transportAllowance: [
    requiredRule('Ingresa el auxilio de transporte'),
    betweenRule(0, 10000000),
  ],
  validFrom: [requiredRule('Ingresa la fecha de vigencia')],
  percentage: [requiredRule('Ingresa el porcentaje'), betweenRule(0, 100)],
  amount: [requiredRule('Ingresa el valor')],
}

const addRate = () => {
  formState.withholdingRates.push({ from: 0, to: 0, percentage: 0 })
}

const removeRate = (index: number) => {
  formState.withholdingRates.splice(index, 1)
}

const toDecimal = (percent: number) => Number((Number(percent) / 100).toFixed(4))

const save = async () => {
  const { valid } = (await formRef.value?.validate()) ?? { valid: true }
  if (!valid) return

  saving.value = true
  error.value = ''
  try {
    emit('saved', {
      uvtValue: Number(formState.uvtValue),
      minimumWage: Number(formState.minimumWage),
      transportAllowance: Number(formState.transportAllowance),
      arlRiskClass: Number(formState.arlRiskClass),
      validFrom: formState.validFrom,
      healthPercentages: {
        employee: toDecimal(formState.healthEmployee),
        employer: toDecimal(formState.healthEmployer),
      },
      pensionPercentages: {
        employee: toDecimal(formState.pensionEmployee),
        employer: toDecimal(formState.pensionEmployer),
      },
      nightSurchargePercentage: toDecimal(formState.nightSurcharge),
      overtimeDayPercentage: toDecimal(formState.extraDay),
      overtimeNightPercentage: toDecimal(formState.extraNight),
      arlRates: {
        '1': Number(formState.arlRate1) / 100,
        '2': Number(formState.arlRate2) / 100,
        '3': Number(formState.arlRate3) / 100,
        '4': Number(formState.arlRate4) / 100,
        '5': Number(formState.arlRate5) / 100,
      },
      parafiscales: {
        sena: toDecimal(formState.sena),
        icbf: toDecimal(formState.icbf),
        compensationFund: toDecimal(formState.compensationFund),
      },
      incapacidadComunDailyPercent: toDecimal(formState.incapacidadPercent),
      employerPaidIncapacidadDays: Number(formState.employerPaidIncapacidadDays),
      baseHoursPerMonth: Number(formState.baseHoursPerMonth),
      withholdingRates: formState.withholdingRates.map((rate) => ({
        from: Number(rate.from),
        to: Number(rate.to),
        percentage: Number(rate.percentage),
      })),
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
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

    <v-form ref="formRef" @submit.prevent="save">
      <v-stepper v-model="step">
        <v-stepper-header>
          <v-stepper-item :value="1" title="Valores generales" />
          <v-stepper-item :value="2" title="Porcentajes" />
          <v-stepper-item :value="3" title="Riesgos y parafiscales" />
          <v-stepper-item :value="4" title="Retención y vigencia" />
        </v-stepper-header>

        <v-stepper-window>
          <v-stepper-window-item :value="1">
            <v-row class="pa-4">
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="formState.uvtValue"
                  label="Valor UVT ($)"
                  type="number"
                  :rules="rules.uvtValue"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="formState.minimumWage"
                  label="Salario mínimo mensual ($)"
                  type="number"
                  :rules="rules.minimumWage"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="formState.transportAllowance"
                  label="Auxilio de transporte ($)"
                  type="number"
                  :rules="rules.transportAllowance"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="formState.arlRiskClass"
                  label="Clase de riesgo ARL"
                  :items="[1, 2, 3, 4, 5]"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="formState.validFrom"
                  label="Vigente desde"
                  type="date"
                  :rules="rules.validFrom"
                />
              </v-col>
            </v-row>
          </v-stepper-window-item>

          <v-stepper-window-item :value="2">
            <v-row class="pa-4">
              <v-col cols="12" md="6">
                <h3 class="text-subtitle-2 font-weight-bold mb-2">Salud (%)</h3>
                <v-text-field
                  v-model="formState.healthEmployee"
                  label="Empleado"
                  type="number"
                  :rules="rules.percentage"
                />
                <v-text-field
                  v-model="formState.healthEmployer"
                  label="Empleador"
                  type="number"
                  :rules="rules.percentage"
                />
              </v-col>
              <v-col cols="12" md="6">
                <h3 class="text-subtitle-2 font-weight-bold mb-2">Pensión (%)</h3>
                <v-text-field
                  v-model="formState.pensionEmployee"
                  label="Empleado"
                  type="number"
                  :rules="rules.percentage"
                />
                <v-text-field
                  v-model="formState.pensionEmployer"
                  label="Empleador"
                  type="number"
                  :rules="rules.percentage"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="formState.nightSurcharge"
                  label="Recargo nocturno (%)"
                  type="number"
                  :rules="rules.percentage"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="formState.extraDay"
                  label="Extra diurna (%)"
                  type="number"
                  :rules="rules.percentage"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="formState.extraNight"
                  label="Extra nocturna (%)"
                  type="number"
                  :rules="rules.percentage"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="formState.incapacidadPercent"
                  label="Incapacidad común diaria (%)"
                  type="number"
                  :rules="rules.percentage"
                  hint="66,67% = 2/3 del salario diario"
                  persistent-hint
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="formState.employerPaidIncapacidadDays"
                  label="Días de incapacidad pagados por la empresa"
                  type="number"
                  :rules="[betweenRule(0, 180)]"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="formState.baseHoursPerMonth"
                  label="Horas base del mes"
                  type="number"
                  :rules="[betweenRule(1, 744)]"
                  hint="Salario ÷ horas = valor hora (240 por defecto)"
                  persistent-hint
                />
              </v-col>
            </v-row>
          </v-stepper-window-item>

          <v-stepper-window-item :value="3">
            <v-row class="pa-4">
              <v-col cols="12">
                <h3 class="text-subtitle-2 font-weight-bold mb-2">
                  Tarifas ARL por clase de riesgo (%)
                </h3>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-text-field
                  v-model="formState.arlRate1"
                  label="Clase 1"
                  type="number"
                  :rules="rules.percentage"
                  hint="Ej. 0,522"
                  persistent-hint
                />
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-text-field
                  v-model="formState.arlRate2"
                  label="Clase 2"
                  type="number"
                  :rules="rules.percentage"
                  hint="Ej. 1,044"
                  persistent-hint
                />
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-text-field
                  v-model="formState.arlRate3"
                  label="Clase 3"
                  type="number"
                  :rules="rules.percentage"
                  hint="Ej. 2,436"
                  persistent-hint
                />
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-text-field
                  v-model="formState.arlRate4"
                  label="Clase 4"
                  type="number"
                  :rules="rules.percentage"
                  hint="Ej. 4,35"
                  persistent-hint
                />
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-text-field
                  v-model="formState.arlRate5"
                  label="Clase 5"
                  type="number"
                  :rules="rules.percentage"
                  hint="Ej. 6,96"
                  persistent-hint
                />
              </v-col>
              <v-col cols="12">
                <h3 class="text-subtitle-2 font-weight-bold mb-2 mt-2">
                  Parafiscales (%)
                </h3>
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="formState.sena"
                  label="SENA"
                  type="number"
                  :rules="rules.percentage"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="formState.icbf"
                  label="ICBF"
                  type="number"
                  :rules="rules.percentage"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="formState.compensationFund"
                  label="Caja de compensación"
                  type="number"
                  :rules="rules.percentage"
                />
              </v-col>
              <v-col cols="12">
                <v-alert
                  type="info"
                  variant="tonal"
                  density="compact"
                  text="Los empleadores con más de 10 trabajadores están exentos de SENA e ICBF (Ley 1607 de 2012). Si aplica, configure esos valores en 0."
                />
              </v-col>
            </v-row>
          </v-stepper-window-item>

          <v-stepper-window-item :value="4">
            <div class="pa-4">
              <div class="d-flex align-center mb-2">
                <h3 class="text-subtitle-2 font-weight-bold">Tarifas de retención</h3>
                <v-spacer />
                <v-btn
                  size="small"
                  color="primary"
                  variant="tonal"
                  prepend-icon="mdi-plus"
                  @click="addRate"
                >
                  Agregar rango
                </v-btn>
              </div>

              <v-row
                v-for="(rate, index) in formState.withholdingRates"
                :key="index"
                align="center"
              >
                <v-col cols="3">
                  <v-text-field
                    v-model.number="rate.from"
                    label="Desde ($)"
                    type="number"
                    :rules="rules.amount"
                  />
                </v-col>
                <v-col cols="3">
                  <v-text-field
                    v-model.number="rate.to"
                    label="Hasta ($)"
                    type="number"
                    :rules="rules.amount"
                  />
                </v-col>
                <v-col cols="3">
                  <v-text-field
                    v-model.number="rate.percentage"
                    label="%"
                    type="number"
                    :rules="rules.percentage"
                  />
                </v-col>
                <v-col cols="3" class="d-flex justify-end">
                  <v-btn
                    icon="mdi-delete-outline"
                    size="small"
                    variant="text"
                    color="error"
                    @click="removeRate(index)"
                  />
                </v-col>
              </v-row>
            </div>
          </v-stepper-window-item>
        </v-stepper-window>
      </v-stepper>

      <div class="d-flex justify-end ga-2 mt-4">
        <v-btn variant="text" color="grey-darken-1" @click="emit('cancel')"> Cancelar </v-btn>
        <v-btn v-if="step > 1" variant="text" @click="step--"> Anterior </v-btn>
        <v-btn v-if="step < 3" color="primary" variant="tonal" @click="step++"> Siguiente </v-btn>
        <v-btn
          v-else
          color="primary"
          variant="tonal"
          type="submit"
          :loading="saving"
          :disabled="saving"
        >
          Crear período
        </v-btn>
      </div>
    </v-form>
  </div>
</template>
