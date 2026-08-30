<script setup lang="ts">
const props = defineProps<{
  section?: string
}>()

const { openHelp } = useHelp()
const route = useRoute()

const sectionId = computed(
  () => props.section || getSectionForPath(route.path) || undefined,
)

const handleClick = () => openHelp(sectionId)
</script>

<template>
  <v-btn
    variant="text"
    icon="mdi-help-circle-outline"
    title="Ayuda de esta página"
    @click="handleClick"
  />
</template>
