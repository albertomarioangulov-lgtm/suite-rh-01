<script setup lang="ts">
import AccountMenu from '~/components/layout/AccountMenu.vue'

const props = defineProps<{ drawer: boolean }>()
const emit = defineEmits<{
  (e: 'update:drawer', value: boolean): void
}>()

const toggleDrawer = () => emit('update:drawer', !props.drawer)
</script>

<template>
  <v-app-bar app flat density="comfortable" class="layout-app-bar">
    <v-app-bar-nav-icon @click="toggleDrawer" />
    <div class="d-flex align-center ml-1">
      <v-img
        src="/images/logo-suite-rh.svg"
        alt="Suite RH"
        width="170"
        height="36"
        contain
      />
    </div>
    <v-spacer />

    <LayoutTenantSwitcher />

    <CommonModuleRequestHint />

    <ClientOnly>
      <v-tooltip location="bottom" text="Ayuda de esta página">
        <template #activator="{ props: tooltipProps }">
          <HelpButton v-bind="tooltipProps" />
        </template>
      </v-tooltip>
    </ClientOnly>

    <LayoutAlertBell />

    <AccountMenu />
  </v-app-bar>
</template>

<style scoped>
.layout-app-bar {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}
</style>
