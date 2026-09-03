<script setup lang="ts">
import type { ICompanyView } from '~/composables/states/useCompanyState'
import { FEATURE_FLAGS } from '~~/shared/feature-flags'
import { useFeatureFlagsState } from '~/composables/states/useFeatureFlagsState'

defineProps<{
  company: ICompanyView
}>()

const regimeLabel = (regime: string) => (regime === 'common' ? 'Común' : 'Simplificado')

const frequencyLabel: Record<string, string> = {
  semanal: 'Semanal',
  decenal: 'Decenal',
  catorcenal: 'Catorcenal',
  quincenal: 'Quincenal',
  mensual: 'Mensual',
  otro: 'Otro',
}

const methodLabel: Record<number, string> = {
  1: 'Instrumento no definido',
  10: 'Efectivo',
  20: 'Cheque',
  42: 'Consignación bancaria',
  45: 'Transferencia crédito bancario',
  48: 'Tarjeta crédito',
  49: 'Tarjeta débito',
  98: 'CATS – Nequi, Daviplata, etc.',
}

// Los datos DIAN/DSNE solo se muestran cuando el tenant usa Nómina.
const { enabledFlags, fetchFlags } = useFeatureFlagsState()
onMounted(async () => {
  if (enabledFlags.value.length === 0) await fetchFlags()
})
const dianVisible = computed(() =>
  enabledFlags.value.includes(FEATURE_FLAGS.PAYROLL),
)
</script>

<template>
  <v-card>
    <v-card-item>
      <template #prepend>
        <v-avatar color="primary" variant="tonal" size="48">
          <v-icon color="primary">mdi-office-building-outline</v-icon>
        </v-avatar>
      </template>
      <v-card-title class="text-h6 font-weight-bold">
        {{ company.name }}
      </v-card-title>
      <v-card-subtitle>
        {{ company.nit ? `NIT ${company.nit}` : 'Sin NIT configurado' }}
      </v-card-subtitle>
      <template #append>
        <v-chip size="small" color="success" variant="tonal">Activa</v-chip>
      </template>
    </v-card-item>

    <v-divider />

    <v-list>
      <v-list-item
        title="Dirección"
        :subtitle="company.address"
        prepend-icon="mdi-map-marker-outline"
      />
      <v-list-item
        title="Régimen tributario"
        :subtitle="regimeLabel(company.taxRegime)"
        prepend-icon="mdi-file-document-outline"
      />
      <v-list-item
        v-if="dianVisible"
        title="Municipio (DSNE)"
        :subtitle="company.municipalityCode || 'No configurado — requerido para el XML DIAN'"
        prepend-icon="mdi-map-marker-radius-outline"
      />
      <v-list-item
        v-if="dianVisible"
        title="Frecuencia de nómina (DSNE)"
        :subtitle="frequencyLabel[company.payrollFrequency] ?? company.payrollFrequency"
        prepend-icon="mdi-calendar-month-outline"
      />
      <v-list-item
        v-if="dianVisible"
        title="Ambiente DSNE"
        :subtitle="company.cenEnvironment === 1 ? 'Producción' : 'Pruebas (habilitación)'"
        prepend-icon="mdi-cloud-outline"
      />
      <v-list-item
        v-if="dianVisible"
        title="Método de pago (DSNE)"
        :subtitle="methodLabel[company.paymentMethod ?? 42] ?? 'Consignación bancaria'"
        prepend-icon="mdi-cash-multiple"
      />
      <v-list-item
        v-if="dianVisible"
        title="Software DIAN"
        :subtitle="company.softwareId && company.softwarePin ? `${company.softwareId} · PIN configurado` : 'No configurado — requerido antes de transmitir a la DIAN'"
        prepend-icon="mdi-application-cog-outline"
      />
      <v-list-item
        v-if="dianVisible"
        title="Certificado de firma (DSNE)"
        :subtitle="company.cenCertificateConfigured ? `Configurado · Firma: ${company.cenSignerRole === 'thirdparty' ? 'proveedor (thirdparty)' : 'empleador (supplier)'}` : 'No configurado — el XML se descarga sin firma'"
        prepend-icon="mdi-certificate-outline"
      />
      <v-list-item
        title="Jornada"
        :subtitle="`Máx ${company.workSchedule.maxWeeklyHours} h/semana · ${company.workSchedule.minDailyHours}–${company.workSchedule.maxDailyHours} h/día`"
        prepend-icon="mdi-clock-outline"
      />
      <v-list-item
        title="Jornada nocturna"
        :subtitle="`${company.workSchedule.nightShiftStart} – ${company.workSchedule.nightShiftEnd}`"
        prepend-icon="mdi-weather-night"
      />
      <v-list-item
        title="Políticas de ausencias"
        :subtitle="`Incapacidad común: ${company.absencePolicies?.employerPaidIncapacidadDays ?? 2} día(s) empresa · Recargo descanso: ${company.absencePolicies?.restDaySurchargeOverride ? `${(Number(company.absencePolicies.restDaySurchargeOverride) * 100).toFixed(0)}%` : 'legal 80/90/100%'} · Soporte: ${company.absencePolicies?.requireSupportDocument ? 'exigido' : 'opcional'}`"
        prepend-icon="mdi-calendar-edit-outline"
      />
    </v-list>
  </v-card>
</template>
