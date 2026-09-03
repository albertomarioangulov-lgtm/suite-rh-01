<script setup lang="ts">
import { useThemeToggle } from '~/composables/useTheme'
import { ROLES, ROLE_LABELS } from '~~/shared/auth'

const { user, logout } = useAuthState()
const { themes, currentThemeId, setTheme } = useThemeToggle()
const { options: densityOptions, density, setDensity } = useDensity()
const themesOpen = ref(false)
const densityOpen = ref(false)

const displayName = computed(() => user.value?.name || user.value?.email || 'Usuario')
const roleLabel = computed(() => (user.value ? ROLE_LABELS[user.value.role] : ''))

const menuItems = computed(() => {
  const items: Array<{ title: string; icon: string; to: string }> = [
    { title: 'Perfil', icon: 'mdi-account-circle-outline', to: '/profile' },
  ]
  const role = user.value?.role
  if (
    role &&
    [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.HR].includes(role)
  ) {
    items.push({
      title: 'Configuración',
      icon: 'mdi-office-building-outline',
      to: '/admin/configuration',
    })
  }
  if (role === ROLES.EMPLOYEE || user.value?.employeeId) {
    items.push({
      title: 'Mi portal',
      icon: 'mdi-account-card-outline',
      to: '/portal',
    })
  }
  return items
})

const handleLogout = async () => {
  await logout()
  await navigateTo('/auth/login')
}
</script>

<template>
  <v-menu placement="bottom-end" offset-y>
    <template #activator="{ props: activatorProps }">
      <v-btn v-bind="activatorProps" variant="text" class="px-2">
        <v-icon class="mr-1">mdi-account-circle</v-icon>
        <span class="text-none text-body-2">{{ displayName }}</span>
      </v-btn>
    </template>

    <v-list>
      <template v-if="user">
        <v-list-item density="compact" class="text-caption text-medium-emphasis" disabled>
          <v-list-item-title class="font-weight-medium">
            {{ displayName }}
          </v-list-item-title>
          <template v-if="user.email" #subtitle>
            {{ roleLabel }}
          </template>
        </v-list-item>

        <v-divider />
      </template>

      <v-list-item clickable density="compact" @click.stop="themesOpen = !themesOpen">
        <template #prepend>
          <v-icon size="small">mdi-palette</v-icon>
        </template>
        <v-list-item-title>Temas</v-list-item-title>
        <template #append>
          <v-icon size="small">
            {{ themesOpen ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
          </v-icon>
        </template>
      </v-list-item>

      <template v-if="themesOpen">
        <v-list-item
          v-for="theme in themes"
          :key="theme.id"
          :active="theme.id === currentThemeId"
          :color="theme.id === currentThemeId ? 'primary' : undefined"
          clickable
          density="compact"
          class="ml-4"
          @click.stop="setTheme(theme.id)"
        >
          <template #prepend>
            <v-icon size="small">{{ theme.icon }}</v-icon>
          </template>
          <v-list-item-title>{{ theme.label }}</v-list-item-title>
          <template #append>
            <v-icon v-if="theme.id === currentThemeId" size="x-small" color="primary">
              mdi-check
            </v-icon>
          </template>
        </v-list-item>
      </template>

      <v-list-item clickable density="compact" @click.stop="densityOpen = !densityOpen">
        <template #prepend>
          <v-icon size="small">mdi-format-line-spacing</v-icon>
        </template>
        <v-list-item-title>Densidad</v-list-item-title>
        <template #append>
          <v-icon size="small">
            {{ densityOpen ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
          </v-icon>
        </template>
      </v-list-item>

      <template v-if="densityOpen">
        <v-list-item
          v-for="option in densityOptions"
          :key="option.id"
          :active="option.id === density"
          :color="option.id === density ? 'primary' : undefined"
          clickable
          density="compact"
          class="ml-4"
          @click.stop="setDensity(option.id)"
        >
          <template #prepend>
            <v-icon size="small">{{ option.icon }}</v-icon>
          </template>
          <v-list-item-title>{{ option.label }}</v-list-item-title>
          <template #append>
            <v-icon v-if="option.id === density" size="x-small" color="primary">
              mdi-check
            </v-icon>
          </template>
        </v-list-item>
      </template>

      <v-divider />

      <v-list-item
        v-for="item in menuItems"
        :key="item.title"
        :to="item.to"
        clickable
        density="compact"
      >
        <template #prepend>
          <v-icon size="small">{{ item.icon }}</v-icon>
        </template>
        <v-list-item-title>{{ item.title }}</v-list-item-title>
      </v-list-item>

      <template v-if="user">
        <v-divider />

        <v-list-item clickable density="compact" @click="handleLogout">
          <template #prepend>
            <v-icon size="small">mdi-logout</v-icon>
          </template>
          <v-list-item-title>Cerrar sesión</v-list-item-title>
        </v-list-item>
      </template>
      <template v-else>
        <v-divider />

        <v-list-item :to="'/auth/login'" clickable density="compact">
          <template #prepend>
            <v-icon size="small">mdi-login</v-icon>
          </template>
          <v-list-item-title>Iniciar sesión</v-list-item-title>
        </v-list-item>
      </template>
    </v-list>
  </v-menu>
</template>
