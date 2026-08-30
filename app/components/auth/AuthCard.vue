<script setup lang="ts">
const { backgroundStyle } = useBackground()

withDefaults(defineProps<{ loading?: boolean }>(), {
  loading: false,
})
</script>

<template>
  <v-container
    class="fill-height d-flex align-center justify-center"
    fluid
    :style="[backgroundStyle]"
  >
    <v-card
      theme="light"
      elevation="24"
      max-width="440"
      width="100%"
      class="mx-auto position-relative overflow-hidden"
    >
      <v-progress-linear
        :indeterminate="loading"
        color="primary"
        height="4"
        class="position-absolute top-0 left-0 right-0"
        style="z-index: 1"
      />

      <v-card color="#243E6F" class="mx-4 mt-4">
        <v-sheet color="#243E6F" class="d-flex justify-center align-center">
          <img
            class="my-4 px-4"
            height="56"
            src="/images/logo-suite-rh-blanco.svg"
            alt="Suite RH"
          />
        </v-sheet>
      </v-card>

      <slot />
    </v-card>
  </v-container>
</template>
