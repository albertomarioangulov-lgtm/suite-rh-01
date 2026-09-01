<script setup lang="ts">
import type { ICompanyView } from '~/composables/states/useCompanyState'

defineProps<{
  company: ICompanyView
}>()

const regimeLabel = (regime: string) => (regime === 'common' ? 'Común' : 'Simplificado')
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
      <v-card-subtitle>NIT {{ company.nit }}</v-card-subtitle>
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
        title="Municipio (DSNE)"
        :subtitle="company.municipalityCode || 'No configurado — requerido para el XML DIAN'"
        prepend-icon="mdi-map-marker-radius-outline"
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
