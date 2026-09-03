<script setup lang="ts">
import { FEATURE_FLAG_LABELS, useFeatureFlagsState } from '~/composables/states/useFeatureFlagsState'
import { ROLES } from '~~/shared/auth'
import {
  FEATURE_FLAG_LIST,
  UNBUILT_MODULES,
  type FeatureFlag,
} from '~~/shared/feature-flags'

const props = defineProps<{
  /** Módulos sugeridos para este contexto (p. ej. ['attendance', 'absences']). */
  suggest?: FeatureFlag[]
}>()

const { enabledFlags } = useFeatureFlagsState()
const { openRequest } = useModuleRequestState()
const { user } = useAuthState()

const menuOpen = ref(false)

const isStaff = computed(
  () =>
    !!user.value &&
    [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR, ROLES.SUPERADMIN].includes(
      user.value.role,
    ),
)

// Sin `suggest`, aplica a todos los módulos construidos del catálogo.
const candidates = computed<FeatureFlag[]>(() =>
  (props.suggest && props.suggest.length
    ? props.suggest
    : FEATURE_FLAG_LIST
  ).filter((flag) => !UNBUILT_MODULES.includes(flag)),
)

const missing = computed(() =>
  candidates.value.filter(
    (flag) => !enabledFlags.value.includes(flag),
  ),
)

const choose = (flag: FeatureFlag) => {
  menuOpen.value = false
  openRequest(flag)
}
</script>

<template>
  <v-menu
    v-if="isStaff && missing.length"
    v-model="menuOpen"
    location="bottom end"
    offset="8"
  >
    <template #activator="{ props: activatorProps }">
      <v-btn
        v-bind="activatorProps"
        icon
        size="small"
        variant="tonal"
        color="info"
        title="Módulos disponibles por activar"
        class="module-hint-btn"
      >
        <v-icon>mdi-lightbulb-on-outline</v-icon>
        <span class="module-hint-dot" />
      </v-btn>
    </template>

    <v-card min-width="300" max-width="380">
      <v-card-item>
        <v-card-title class="text-subtitle-2 font-weight-bold">
          Módulos por activar
        </v-card-title>
        <v-card-subtitle class="text-caption">
          AMAV puede activarlos según tu plan. Presiona uno para solicitarlo.
        </v-card-subtitle>
      </v-card-item>
      <v-divider />
      <v-list density="compact">
        <v-list-item
          v-for="flag in missing"
          :key="flag"
          :title="FEATURE_FLAG_LABELS[flag]"
          prepend-icon="mdi-lock-open-variant-outline"
          @click="choose(flag)"
        >
          <template #append>
            <v-icon size="small">mdi-chevron-right</v-icon>
          </template>
        </v-list-item>
      </v-list>
    </v-card>
  </v-menu>
</template>

<style scoped>
.module-hint-btn {
  position: relative;
  animation: module-hint-pulse 2.4s ease-in-out infinite;
}

.module-hint-dot {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgb(var(--v-theme-warning));
  border: 1px solid rgb(var(--v-theme-surface));
}

@keyframes module-hint-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(var(--v-theme-primary), 0);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(var(--v-theme-primary), 0.18);
  }
}
</style>
