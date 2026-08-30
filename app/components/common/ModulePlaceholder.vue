<script setup lang="ts">
defineProps<{
  title: string
  description: string
  icon: string
  helpTopic?: string
}>()
</script>

<template>
  <v-card class="text-center pa-8 position-relative">
    <ClientOnly v-if="helpTopic">
      <v-tooltip location="bottom" text="Ayuda sobre esta página">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon="mdi-help-circle-outline"
            variant="text"
            color="primary"
            class="position-absolute top-0 right-0 ma-2"
            :to="`/help?topic=${helpTopic}`"
          />
        </template>
      </v-tooltip>
    </ClientOnly>
    <v-icon size="64" color="primary" class="mb-4">
      {{ icon }}
    </v-icon>
    <h2 class="text-h5 font-weight-bold mb-2">{{ title }}</h2>
    <p class="text-body-1 text-medium-emphasis mb-6">
      {{ description }}
    </p>
    <v-btn color="primary" variant="flat" to="/home"> Volver al inicio </v-btn>
  </v-card>
</template>
