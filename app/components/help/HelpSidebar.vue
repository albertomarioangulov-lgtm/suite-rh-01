<script setup lang="ts">
import {
  helpSections,
  categoryLabel,
  type HelpAudience,
  type HelpCategory,
} from '~/data/help-sections'

defineProps<{
  activeId: string | null
}>()

const emit = defineEmits<{
  (e: 'select', id: string): void
}>()

const search = ref('')
const audience = ref<HelpAudience | 'todos'>('todos')

const audienceOptions = [
  { title: 'Todos', value: 'todos' },
  { title: 'Gestión', value: 'gestion' },
  { title: 'Empleado', value: 'empleado' },
]

const matchesQuery = (q: string, section: (typeof helpSections)[number]): boolean => {
  const haystack = [
    section.title,
    section.summary,
    ...section.blocks.map((block) => {
      if (block.text) return block.text
      if (block.items) return block.items.join(' ')
      if (block.rows) return block.rows.flat().join(' ')
      return ''
    }),
    ...(section.faqs ?? []).flatMap((faq) => [faq.q, faq.a]),
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return helpSections.filter((section) => {
    const matchesAudience =
      audience.value === 'todos' ||
      section.audience === 'todos' ||
      section.audience === audience.value
    return matchesAudience && (!q || matchesQuery(q, section))
  })
})

const categoryOrder: HelpCategory[] = ['modulos', 'procesos', 'roles', 'referencia']

const grouped = computed(() =>
  categoryOrder
    .map((category) => ({
      category,
      label: categoryLabel(category),
      sections: filtered.value.filter((section) => section.category === category),
    }))
    .filter((group) => group.sections.length > 0),
)

const onSelect = (id: string | null) => {
  if (id) emit('select', id)
}
</script>

<template>
  <div>
    <v-text-field
      v-model="search"
      prepend-inner-icon="mdi-magnify"
      density="compact"
      variant="solo"
      hide-details
      clearable
      placeholder="Buscar en la ayuda..."
      class="mb-3"
    />

    <v-chip-group v-model="audience" mandatory class="mb-3">
      <v-chip
        v-for="option in audienceOptions"
        :key="option.value"
        :value="option.value"
        size="small"
        filter
        variant="tonal"
      >
        {{ option.title }}
      </v-chip>
    </v-chip-group>

    <v-select
      :model-value="activeId"
      :items="filtered"
      item-title="title"
      item-value="id"
      label="Tema"
      density="compact"
      hide-details
      class="mb-3 d-md-none"
      @update:model-value="onSelect"
    />

    <div class="help-nav-list d-none d-md-block">
      <template v-for="group in grouped" :key="group.category">
        <div class="text-caption text-grey font-weight-bold px-3 mt-2 mb-1">
          {{ group.label }}
        </div>
        <v-list density="compact" nav class="bg-transparent">
          <v-list-item
            v-for="section in group.sections"
            :key="section.id"
            :active="section.id === activeId"
            color="primary"
            rounded="lg"
            variant="tonal"
            @click="emit('select', section.id)"
          >
            <template #prepend>
              <v-icon size="small">{{ section.icon }}</v-icon>
            </template>
            <v-list-item-title class="text-body-2">
              {{ section.title }}
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </template>
    </div>

    <p v-if="filtered.length === 0" class="text-caption text-grey pa-3">
      No se encontraron temas con ese término.
    </p>
  </div>
</template>

<style scoped>
@media (min-width: 960px) {
  .help-nav-list {
    max-height: calc(100vh - 220px);
    overflow-y: auto;
  }
}
</style>
