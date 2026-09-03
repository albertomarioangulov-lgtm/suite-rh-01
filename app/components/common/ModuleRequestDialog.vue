<script setup lang="ts">
import { FEATURE_FLAG_LIST } from '~~/shared/feature-flags'
import { FEATURE_FLAG_LABELS } from '~/composables/states/useFeatureFlagsState'
import { useFeatureFlagsState } from '~/composables/states/useFeatureFlagsState'

const {
  open,
  module,
  message,
  sending,
  closeRequest,
  sendRequest,
} = useModuleRequestState()

const moduleOptions = FEATURE_FLAG_LIST.map((flag) => ({
  title: FEATURE_FLAG_LABELS[flag],
  value: flag,
}))

const { enabledFlags } = useFeatureFlagsState()
const suggestions = computed(() =>
  FEATURE_FLAG_LIST.filter(
    (flag) => !enabledFlags.value.includes(flag),
  ),
)
</script>

<template>
  <v-dialog v-model="open" max-width="480">
    <v-card>
      <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold">
        <v-icon class="mr-2" color="primary">mdi-lock-open-variant-outline</v-icon>
        Solicitar activación de módulo
      </v-card-title>
      <v-divider />
      <v-card-text class="pt-4">
        <p class="text-body-2 mb-3">
          ¿Te interesa algún módulo que aún no está activo? Cuéntanos cuál y
          quedará registrado para que el proveedor (AMAV) lo gestione según tu
          plan. No tienes que escribir un correo.
        </p>
        <div v-if="!module && suggestions.length" class="mb-3">
          <div class="text-caption text-medium-emphasis mb-1">
            Módulos desactivados para esta empresa:
          </div>
          <div class="d-flex flex-wrap ga-1">
            <v-chip
              v-for="flag in suggestions"
              :key="flag"
              size="small"
              variant="tonal"
              color="primary"
              @click="module = flag"
            >
              {{ FEATURE_FLAG_LABELS[flag] }}
            </v-chip>
          </div>
        </div>
        <v-select
          v-model="module"
          :items="moduleOptions"
          label="Módulo"
          item-title="title"
          item-value="value"
          class="mb-3"
        />
        <v-textarea
          v-model="message"
          label="¿Para qué lo necesitas? (opcional)"
          rows="2"
          maxlength="500"
          counter
          class="mb-1"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="sending" @click="closeRequest">
          Cancelar
        </v-btn>
        <v-btn
          color="primary"
          variant="tonal"
          :loading="sending"
          :disabled="!module"
          @click="sendRequest"
        >
          Enviar solicitud
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
