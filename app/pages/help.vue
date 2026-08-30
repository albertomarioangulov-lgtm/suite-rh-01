<script setup lang="ts">
import { getHelpSection } from '~/data/help-sections'

definePageMeta({
  layout: 'default',
  middleware: 'auth',
})

const route = useRoute()

// Soporta ?seccion= (nuevo formato) y ?topic= (formato anterior).
const activeSectionId = computed(() => {
  const fromSeccion = String(route.query.seccion || '')
  if (getHelpSection(fromSeccion)) return fromSeccion
  const legacyTopics: Record<string, string> = {
    usuarios: 'usuarios',
    home: 'inicio',
    perfil: 'perfil',
    empleados: 'empleados',
    nomina: 'nomina',
    reportes: 'reportes',
    ajustes: 'configuracion',
  }
  return legacyTopics[String(route.query.topic || '')] ?? ''
})

const selectSection = (id: string) => {
  navigateTo({ path: '/help', query: { seccion: id } })
}
</script>

<template>
  <div>
    <CommonPageHeader
      title="Centro de ayuda"
      subtitle="Manual de uso, guías y solución de problemas"
    />

    <v-card>
      <v-card-text class="pt-4">
        <v-row>
          <v-col cols="12" md="4" lg="3">
            <HelpSidebar :active-id="activeSectionId" @select="selectSection" />
          </v-col>
          <v-col cols="12" md="8" lg="9">
            <v-divider class="mb-4 d-md-none" />
            <HelpContent :section-id="activeSectionId" />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </div>
</template>
