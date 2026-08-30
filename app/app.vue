<!-- app.vue -->
<template>
  <VApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <CommonAppSnackbar />
  </VApp>
</template>

<script setup lang="ts">
// Configuración global de la app
useHead({
  link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
  titleTemplate: (title) => (title ? `${title} · Suite RH` : 'Suite RH'),
  htmlAttrs: {
    lang: 'es',
  },
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { name: 'description', content: 'Suite RH: sistema de gestión de recursos humanos para Colombia' },
  ],
})
</script>

<style>
html {
  overflow-y: auto;
}

body {
  font-family: 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  margin: 0;
}
</style>
