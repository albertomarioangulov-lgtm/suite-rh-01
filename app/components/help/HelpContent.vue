<script setup lang="ts">
import {
  helpSections,
  getHelpSection,
  audienceLabel,
  categoryLabel,
  isHelpSectionVisible,
  type HelpCategory,
} from '~/data/help-sections'

const props = defineProps<{
  sectionId: string | null
  showFullPageLink?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', id: string): void
}>()

const { closeHelp } = useHelp()

const { user } = useAuthState()
const { enabledFlags, fetchFlags, isEnabled } = useFeatureFlagsState()

const role = computed(() => user.value?.role)

onMounted(() => {
  if (enabledFlags.value.length === 0) fetchFlags()
})

const visibleSection = (id: string | null) => {
  const found = getHelpSection(id)
  if (!found) return undefined
  return isHelpSectionVisible(found, role.value, isEnabled) ? found : undefined
}

const section = computed(() => visibleSection(props.sectionId))

const openFullPage = (id: string) => {
  closeHelp()
  navigateTo(`/help?seccion=${id}`)
}

const relatedSections = computed(() => {
  const ids = section.value?.related ?? []
  return ids
    .map((id) => visibleSection(id))
    .filter((item): item is NonNullable<typeof item> => !!item)
})

const categoryOrder: HelpCategory[] = ['modulos', 'procesos', 'roles', 'referencia']

const groupedHome = computed(() =>
  categoryOrder
    .map((category) => ({
      category,
      label: categoryLabel(category),
      sections: helpSections.filter(
        (item) =>
          item.category === category &&
          isHelpSectionVisible(item, role.value, isEnabled),
      ),
    }))
    .filter((group) => group.sections.length > 0),
)
</script>

<template>
  <div v-if="section">
    <div class="d-flex align-center mb-3">
      <v-avatar color="primary" variant="tonal" size="40" class="mr-3">
        <v-icon size="small" color="primary">{{ section.icon }}</v-icon>
      </v-avatar>
      <div>
        <h3 class="text-subtitle-1 font-weight-bold mb-0">{{ section.title }}</h3>
        <span class="text-caption text-grey">
          {{ categoryLabel(section.category) }} · {{ audienceLabel(section.audience) }}
        </span>
      </div>
      <v-spacer />
      <v-btn
        v-if="showFullPageLink"
        variant="text"
        color="primary"
        size="small"
        prepend-icon="mdi-open-in-new"
        @click="openFullPage(section.id)"
      >
        Ver página completa
      </v-btn>
    </div>

    <p class="text-body-2 text-grey mb-4">{{ section.summary }}</p>

    <template v-for="(block, i) in section.blocks" :key="i">
      <h4
        v-if="block.type === 'title'"
        class="text-subtitle-1 font-weight-bold text-primary mt-4 mb-2"
      >
        {{ block.text }}
      </h4>
      <p v-else-if="block.type === 'paragraph'" class="text-body-2 mb-3">
        {{ block.text }}
      </p>
      <ul v-else-if="block.type === 'list'" class="help-list mb-3">
        <li v-for="(item, j) in block.items" :key="j">{{ item }}</li>
      </ul>
      <ol v-else-if="block.type === 'steps'" class="help-steps mb-3">
        <li v-for="(item, j) in block.items" :key="j">{{ item }}</li>
      </ol>
      <v-alert
        v-else-if="block.type === 'warning'"
        :type="block.tone || 'info'"
        variant="tonal"
        density="compact"
        class="mb-3"
      >
        {{ block.text }}
      </v-alert>
      <div v-else-if="block.type === 'table'" class="mb-3">
        <v-table density="compact">
          <thead>
            <tr>
              <th
                v-for="(header, k) in block.headers"
                :key="k"
                class="text-left text-caption"
              >
                {{ header }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, r) in block.rows" :key="r">
              <td v-for="(cell, c) in row" :key="c" class="text-body-2">
                {{ cell }}
              </td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </template>

    <v-expansion-panels
      v-if="section.faqs && section.faqs.length > 0"
      variant="accordion"
      class="mt-4"
    >
      <v-expansion-panel v-for="faq in section.faqs" :key="faq.q">
        <v-expansion-panel-title class="text-body-2 font-weight-medium">
          {{ faq.q }}
        </v-expansion-panel-title>
        <v-expansion-panel-text class="text-body-2">
          {{ faq.a }}
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <div v-if="relatedSections.length" class="mt-5">
      <div class="text-caption text-grey mb-2 font-weight-medium">
        Secciones relacionadas
      </div>
      <v-chip-group>
        <v-chip
          v-for="related in relatedSections"
          :key="related.id"
          size="small"
          variant="tonal"
          color="primary"
          @click="emit('select', related.id)"
        >
          <v-icon start size="small">{{ related.icon }}</v-icon>
          {{ related.title }}
        </v-chip>
      </v-chip-group>
    </div>
  </div>

  <div v-else>
    <p class="text-body-2 text-grey mb-4">
      Seleccione un tema para consultar el manual de uso. Los temas están agrupados
      por categoría e incluyen pasos, estados, preguntas frecuentes y temas
      relacionados.
    </p>
    <template v-for="group in groupedHome" :key="group.category">
      <h4 class="text-subtitle-1 font-weight-bold text-primary mt-4 mb-2">
        {{ group.label }}
      </h4>
      <v-row>
        <v-col v-for="item in group.sections" :key="item.id" cols="12" sm="6" lg="4">
          <v-card class="help-card" @click="emit('select', item.id)">
            <v-card-text>
              <div class="d-flex align-center mb-2">
                <v-avatar color="primary" variant="tonal" size="36" class="mr-2">
                  <v-icon size="small" color="primary">{{ item.icon }}</v-icon>
                </v-avatar>
                <span class="text-subtitle-2 font-weight-bold">{{ item.title }}</span>
              </div>
              <p class="text-caption text-grey mb-2">{{ item.summary }}</p>
              <v-chip size="x-small" variant="tonal">
                {{ audienceLabel(item.audience) }}
              </v-chip>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </div>
</template>

<style scoped>
.help-list {
  padding-left: 1.2rem;
  margin-bottom: 0.5rem;
}

.help-list li {
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.help-steps {
  padding-left: 1.2rem;
  margin-bottom: 0.5rem;
}

.help-steps li {
  font-size: 0.875rem;
  margin-bottom: 0.35rem;
}

.help-card {
  cursor: pointer;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.help-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
