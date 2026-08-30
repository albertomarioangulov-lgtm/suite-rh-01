<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    helpTopic?: string
  }>(),
  { subtitle: '', helpTopic: undefined },
)
</script>

<template>
  <div class="mt-0 mb-3">
    <div class="d-flex flex-wrap align-center ga-3">
      <h1 class="text-h6 font-weight-bold mt-0 mb-0 mr-auto">
        {{ title }}
      </h1>
      <ClientOnly v-if="helpTopic">
        <v-tooltip location="bottom" text="Ayuda sobre esta página">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              icon="mdi-help-circle-outline"
              variant="text"
              color="primary"
              :to="helpTopic ? `/help?topic=${helpTopic}` : '/help'"
            />
          </template>
        </v-tooltip>
      </ClientOnly>
      <slot name="actions" />
    </div>
    <p v-if="subtitle" class="text-body-2 text-medium-emphasis mt-1 mb-0">
      {{ subtitle }}
    </p>
  </div>
</template>
