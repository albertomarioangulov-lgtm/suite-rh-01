<script setup lang="ts">
import { useDisplay } from 'vuetify'

const drawer = ref(true)

const { mobile } = useDisplay()

onMounted(async () => {
  if (mobile.value) drawer.value = false
})
</script>

<template>
  <LayoutAppBar v-model:drawer="drawer" />
  <LayoutNavDrawer v-model="drawer" />

  <v-main>
    <v-container fluid class="ma-0 pa-2">
      <slot />
    </v-container>
  </v-main>

  <HelpDialog />
</template>
