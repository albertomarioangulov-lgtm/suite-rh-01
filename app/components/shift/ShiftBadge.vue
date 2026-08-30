<script setup lang="ts">
defineProps<{
  name: string
  color?: string
}>()
</script>

<template>
  <v-chip size="small" :color="color || 'primary'" text-color="white">
    {{ name }}
  </v-chip>
</template>
