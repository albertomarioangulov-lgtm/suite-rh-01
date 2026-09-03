<script setup lang="ts">
import { FEATURE_FLAG_LABELS, useFeatureFlagsState } from '~/composables/states/useFeatureFlagsState'
import type { FeatureFlag } from '~~/shared/feature-flags'

const props = defineProps<{
  /** Módulos sugeridos para este contexto (p. ej. ['attendance', 'absences']). */
  suggest?: FeatureFlag[]
}>()

const { enabledFlags } = useFeatureFlagsState()
const { openRequest } = useModuleRequestState()

/** Frase corta por módulo para el aviso ("gestionar la asistencia"...). */
const ACTION_TEXT: Partial<Record<FeatureFlag, string>> = {
  attendance: 'gestionar la asistencia',
  absences: 'gestionar las ausencias y permisos',
  shifts: 'gestionar turnos y horarios',
  payroll: 'gestionar la nómina',
  loans: 'gestionar préstamos',
  contracts: 'gestionar contratos',
  performance: 'gestionar evaluaciones de desempeño',
  analytics: 'ver reportes y analítica',
  self_service: 'usar el portal del empleado',
  employees: 'gestionar empleados',
  recruitment: 'gestionar reclutamiento',
}

const missing = computed(() =>
  (props.suggest ?? []).filter(
    (flag) => !enabledFlags.value.includes(flag),
  ),
)

const sentences = computed(() =>
  missing.value.map(
    (flag) =>
      `¿Quieres ${ACTION_TEXT[flag] ?? 'usar este módulo'}? Solicita la activación del módulo de ${FEATURE_FLAG_LABELS[flag]}.`,
  ),
)
</script>

<template>
  <v-alert
    v-if="sentences.length"
    type="info"
    variant="tonal"
    density="compact"
    class="mb-3"
  >
    <div class="d-flex align-center ga-2 flex-wrap">
      <span class="text-body-2">{{ sentences.join(' ') }}</span>
      <v-btn
        variant="text"
        color="primary"
        size="small"
        prepend-icon="mdi-lock-open-variant-outline"
        class="text-none"
        @click="openRequest(null)"
      >
        Solicitar activación
      </v-btn>
    </div>
  </v-alert>
</template>
