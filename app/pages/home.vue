<script setup lang="ts">
import { ROLES, ROLE_LABELS, type UserRole } from '~~/shared/auth'

definePageMeta({
  layout: 'default',
  middleware: 'auth',
})

const { user } = useAuthState()

const today = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date())

const roleLabel = computed(() => (user.value ? ROLE_LABELS[user.value.role] : ''))

const canViewUsers = computed(
  () =>
    !!user.value &&
    ([ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPERADMIN] as UserRole[]).includes(
      user.value.role,
    ),
)

const quickLinks = computed(() => [
  ...(canViewUsers.value
    ? [
        {
          title: 'Usuarios',
          icon: 'mdi-account-multiple-outline',
          to: '/admin/users',
          available: true,
        },
      ]
    : []),
    {
      title: 'Empleados',
      icon: 'mdi-account-group-outline',
      to: '/admin/employees',
      available: true,
    },
  {
    title: 'Nóminas',
    icon: 'mdi-cash-multiple',
    to: '/payrolls',
    available: false,
  },
  {
    title: 'Reportes',
    icon: 'mdi-chart-bar',
    to: '/reports',
    available: false,
  },
])

const modules = [
  { name: 'Autenticación segura', icon: 'mdi-check-circle', color: 'success' },
  { name: 'Gestión de usuarios', icon: 'mdi-check-circle', color: 'success' },
  { name: 'Módulo de empleados', icon: 'mdi-progress-wrench', color: 'warning' },
  { name: 'Nómina y liquidación', icon: 'mdi-progress-wrench', color: 'warning' },
  { name: 'Reportes y estadísticas', icon: 'mdi-progress-wrench', color: 'warning' },
]
</script>

<template>
  <v-row>
    <v-col cols="12">
      <v-card>
        <v-card-item>
          <v-card-title class="text-h5">
            Bienvenido{{ user?.name ? `, ${user.name}` : '' }} 👋
          </v-card-title>
          <v-card-subtitle class="text-capitalize"> {{ roleLabel }} · {{ today }} </v-card-subtitle>
          <template #append>
            <ClientOnly>
              <v-tooltip location="bottom" text="Ayuda sobre esta página">
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon="mdi-help-circle-outline"
                    variant="text"
                    color="primary"
                    to="/help?topic=home"
                  />
                </template>
              </v-tooltip>
            </ClientOnly>
          </template>
        </v-card-item>
      </v-card>
    </v-col>

    <v-col cols="12">
      <h2 class="text-h6 font-weight-bold mb-3">Accesos rápidos</h2>
      <v-row>
        <v-col v-for="link in quickLinks" :key="link.title" cols="12" sm="6" md="4" lg="3">
          <v-card
            :to="link.available ? link.to : undefined"
            :ripple="link.available"
            :class="{ 'opacity-60': !link.available }"
            class="h-100"
            rounded="lg"
          >
            <v-card-item>
              <v-icon size="36" color="primary" class="mb-2">
                {{ link.icon }}
              </v-icon>
              <v-card-title class="pa-0 text-subtitle-1 font-weight-medium">
                {{ link.title }}
              </v-card-title>
              <v-card-subtitle class="pa-0 pt-1">
                <v-chip v-if="link.available" size="x-small" color="success" variant="tonal">
                  Disponible
                </v-chip>
                <v-chip v-else size="x-small" color="warning" variant="tonal">
                  Próximamente
                </v-chip>
              </v-card-subtitle>
            </v-card-item>
          </v-card>
        </v-col>
      </v-row>
    </v-col>

    <v-col cols="12" md="6">
      <v-card>
        <v-card-title class="text-subtitle-1">Estado del sistema</v-card-title>
        <v-divider />
        <v-list density="compact">
          <v-list-item v-for="module in modules" :key="module.name">
            <template #prepend>
              <v-icon :color="module.color">{{ module.icon }}</v-icon>
            </template>
            <v-list-item-title class="text-body-2">
              {{ module.name }}
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card>
    </v-col>
  </v-row>
</template>
