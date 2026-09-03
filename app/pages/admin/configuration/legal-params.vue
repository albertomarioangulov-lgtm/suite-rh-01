<script setup lang="ts">
import { ROLES } from '~~/shared/auth'
import { formatDate } from '~~/shared/utils/datetime-helpers'
import type { ILegalParamsView } from '~/composables/states/useLegalParamsState'

definePageMeta({
  middleware: 'auth',
})

const { user } = useAuthState()
const snackbar = useSnackbarState()
const {
  currentParams,
  historicalParams,
  loading,
  error,
  fetchCurrentParams,
  fetchHistoricalParams,
  createParams,
  activateParams,
} = useLegalParamsState()

const isAdmin = computed(() => user.value?.role === ROLES.ADMIN || user.value?.role === ROLES.SUPERADMIN)

const createOpen = ref(false)
const confirmOpen = ref(false)
const activating = ref<ILegalParamsView | null>(null)
const saving = ref(false)
const formSaving = ref(false)

watch(createOpen, (open) => {
  if (open) formSaving.value = false
})

onMounted(async () => {
  try {
    await fetchCurrentParams()
  } catch {
    // Sin período vigente aún.
  }
  if (isAdmin.value) {
    try {
      await fetchHistoricalParams()
    } catch {
      // Error visible en VAlert.
    }
  }
})

const onCreated = async (data: Record<string, unknown>) => {
  try {
    await createParams(data as unknown as Parameters<typeof createParams>[0])
    createOpen.value = false
    snackbar.success('Período creado. Actívalo cuando esté listo.')
    await fetchCurrentParams()
    await fetchHistoricalParams()
  } catch {
    // Error visible en VAlert.
  }
}

const confirmActivate = (id: string) => {
  activating.value = historicalParams.value.find((params) => params._id === id) ?? null
  confirmOpen.value = true
}

const doActivate = async () => {
  if (!activating.value) return
  saving.value = true
  try {
    await activateParams(activating.value._id)
    confirmOpen.value = false
    snackbar.success('Período activado correctamente')
    await fetchCurrentParams()
    await fetchHistoricalParams()
  } catch {
    // Error visible en VAlert.
  }
  saving.value = false
}

const pct = (value: number) => `${(value * 100).toFixed(1)}%`
</script>

<template>
  <div>
    <CommonPageHeader
      title="Parámetros legales"
      subtitle="UVT, aportes, recargos y retenciones vigentes"
    >
      <template #actions>
        <v-btn
          v-if="isAdmin"
          color="primary"
          variant="tonal"
          prepend-icon="mdi-plus"
          @click="createOpen = true"
        >
          Nuevo período
        </v-btn>
      </template>
    </CommonPageHeader>

    <CommonConfigurationTabs />

    <v-alert
      v-if="error"
      type="error"
      density="compact"
      variant="tonal"
      class="mb-4"
      :text="error"
      closable
      @click:close="error = ''"
    />

    <v-card v-if="currentParams" class="mb-4">
      <v-card-item>
        <template #prepend>
          <v-avatar color="primary" variant="tonal" size="48">
            <v-icon color="primary">mdi-scale-balance</v-icon>
          </v-avatar>
        </template>
        <v-card-title class="text-h6 font-weight-bold"> Parámetros vigentes </v-card-title>
        <v-card-subtitle>
          Desde {{ formatDate(currentParams.validFrom, 'DD/MM/YYYY') }}
        </v-card-subtitle>
        <template #append>
          <v-chip size="small" color="success" variant="tonal">Vigente</v-chip>
        </template>
      </v-card-item>
      <v-divider />
      <v-list>
        <v-list-item
          title="Valor UVT"
          :subtitle="`$${Number(currentParams.uvtValue).toLocaleString('es-CO')}`"
          prepend-icon="mdi-currency-usd"
        />
        <v-list-item
          title="Salario mínimo legal (SMMLV)"
          :subtitle="`$${Number(currentParams.minimumWage).toLocaleString('es-CO')}`"
          prepend-icon="mdi-cash-multiple"
        />
        <v-list-item
          title="Auxilio de transporte"
          :subtitle="`$${Number(currentParams.transportAllowance).toLocaleString('es-CO')}`"
          prepend-icon="mdi-bus"
        />
        <v-list-item
          title="Riesgo ARL"
          :subtitle="`Clase ${currentParams.arlRiskClass}`"
          prepend-icon="mdi-shield-outline"
        />
        <v-list-item
          title="Aportes"
          :subtitle="`Salud: ${pct(currentParams.healthPercentages.employee)} emp. / ${pct(currentParams.healthPercentages.employer)} empdor. · Pensión: ${pct(currentParams.pensionPercentages.employee)} / ${pct(currentParams.pensionPercentages.employer)}`"
          prepend-icon="mdi-account-heart-outline"
        />
        <v-list-item
          title="Recargos y extras"
          :subtitle="`Nocturno ${pct(currentParams.nightSurchargePercentage)} · Extra diurna ${pct(currentParams.overtimeDayPercentage)} · Extra nocturna ${pct(currentParams.overtimeNightPercentage)}`"
          prepend-icon="mdi-weather-night"
        />
        <v-list-item
          title="Incapacidad común"
          :subtitle="`${pct(currentParams.incapacidadComunDailyPercent ?? 2 / 3)} diario · ${currentParams.employerPaidIncapacidadDays ?? 2} día(s) a cargo de la empresa`"
          prepend-icon="mdi-hospital-box-outline"
        />
        <v-list-item
          title="Valor hora"
          :subtitle="`Salario ÷ ${currentParams.baseHoursPerMonth ?? 240} horas/mes`"
          prepend-icon="mdi-timer-outline"
        />
        <v-list-item
          title="ARL por clase de riesgo"
          :subtitle="`1: ${pct(currentParams.arlRates?.['1'] ?? 0.00522)} · 2: ${pct(currentParams.arlRates?.['2'] ?? 0.01044)} · 3: ${pct(currentParams.arlRates?.['3'] ?? 0.02436)} · 4: ${pct(currentParams.arlRates?.['4'] ?? 0.0435)} · 5: ${pct(currentParams.arlRates?.['5'] ?? 0.0696)}`"
          prepend-icon="mdi-shield-check-outline"
        />
        <v-list-item
          title="Parafiscales"
          :subtitle="`SENA ${pct(currentParams.parafiscales?.sena ?? 0.02)} · ICBF ${pct(currentParams.parafiscales?.icbf ?? 0.03)} · Caja ${pct(currentParams.parafiscales?.compensationFund ?? 0.04)}`"
          prepend-icon="mdi-account-group-outline"
        />
      </v-list>
    </v-card>

    <v-card v-if="isAdmin" :loading="loading">
      <v-card-item>
        <v-card-title class="text-subtitle-1 font-weight-bold">
          Historial de períodos
        </v-card-title>
      </v-card-item>
      <v-divider />
      <CompanyParamsHistoryTable
        :items="historicalParams"
        :loading="loading"
        :is-admin="isAdmin"
        @activate="confirmActivate"
      />
    </v-card>

    <v-alert
      v-else-if="currentParams"
      type="info"
      variant="tonal"
      density="compact"
      class="mt-4"
      text="Solo los administradores pueden gestionar los períodos de parámetros."
    />
    <v-alert
      v-else-if="!isAdmin && !loading"
      type="info"
      variant="tonal"
      density="compact"
      class="mt-4"
      text="Aún no hay parámetros legales vigentes registrados."
    />

    <v-dialog v-model="createOpen" max-width="720" persistent>
      <v-card class="position-relative">
        <v-progress-linear
          :indeterminate="formSaving"
          color="primary"
          height="4"
          class="position-absolute top-0 left-0 right-0"
          style="z-index: 1"
        />
        <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center ga-2">
          <v-icon color="primary">mdi-plus-circle-outline</v-icon>
          Nuevo período de parámetros
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="createOpen = false" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pt-4">
          <CompanyLegalParamsForm
            v-if="createOpen"
            @saved="onCreated"
            @cancel="createOpen = false"
            @saving-change="formSaving = $event"
          />
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="confirmOpen" max-width="420" persistent>
      <v-card>
        <v-card-title class="text-subtitle-1"> Activar período </v-card-title>
        <v-card-text>
          ¿Activar el período vigente desde
          <strong>{{ formatDate(activating?.validFrom, 'DD/MM/YYYY') }}</strong
          >? El período actual quedará como histórico.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" color="grey-darken-1" @click="confirmOpen = false">
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="saving"
            :disabled="saving"
            @click="doActivate"
          >
            Activar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
