<script setup lang="ts">
const { state, hide } = useSnackbarState()
</script>

<template>
  <v-snackbar
    :key="state.id"
    v-model="state.visible"
    :color="state.color"
    :timeout="state.timeout"
    location="bottom right"
    rounded="lg"
  >
    <div class="d-flex align-center ga-2">
      <v-icon>{{ state.icon }}</v-icon>
      <span>{{ state.message }}</span>
    </div>

    <template #actions>
      <v-btn variant="text" color="white" @click="hide"> Cerrar </v-btn>
    </template>
  </v-snackbar>
</template>
