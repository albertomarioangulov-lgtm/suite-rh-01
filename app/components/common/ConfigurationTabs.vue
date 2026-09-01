<script setup lang="ts">
const route = useRoute()

const activeTab = computed(() => {
  if (route.path.startsWith('/admin/configuration/legal-params'))
    return 'legal-params'
  if (route.path.startsWith('/admin/configuration/history')) return 'history'
  if (route.path.startsWith('/admin/configuration/alerts')) return 'alerts'
  if (route.path.startsWith('/admin/configuration/flags')) return 'flags'
  if (route.path.startsWith('/admin/configuration/payroll-concepts'))
    return 'payroll-concepts'
  if (route.path.startsWith('/admin/organization')) return 'organization'
  if (route.path.startsWith('/admin/configuration/evaluations')) return 'evaluations'
  return 'company'
})
</script>

<template>
  <v-tabs v-model="activeTab" color="primary" class="mb-4">
    <v-tab
      value="company"
      prepend-icon="mdi-office-building-outline"
      to="/admin/configuration"
    >
      Empresa
    </v-tab>
    <v-tab
      value="legal-params"
      prepend-icon="mdi-scale-balance"
      to="/admin/configuration/legal-params"
    >
      Parámetros legales
    </v-tab>
    <v-tab
      value="history"
      prepend-icon="mdi-history"
      to="/admin/configuration/history"
    >
      Historial
    </v-tab>
    <v-tab
      value="alerts"
      prepend-icon="mdi-bell-outline"
      to="/admin/configuration/alerts"
    >
      Alertas
    </v-tab>
    <v-tab
      value="flags"
      prepend-icon="mdi-toggle-switch-outline"
      to="/admin/configuration/flags"
    >
      Módulos
    </v-tab>
    <v-tab
      value="payroll-concepts"
      prepend-icon="mdi-tag-multiple-outline"
      to="/admin/configuration/payroll-concepts"
    >
      Conceptos de nómina
    </v-tab>
    <v-tab
      value="organization"
      prepend-icon="mdi-sitemap-outline"
      to="/admin/organization"
    >
      Organización
    </v-tab>
    <v-tab
      value="evaluations"
      prepend-icon="mdi-clipboard-check-outline"
      to="/admin/configuration/evaluations"
    >
      Evaluaciones
    </v-tab>
  </v-tabs>
</template>
