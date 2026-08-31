<script setup lang="ts">
import { ROLES, type UserRole } from '~~/shared/auth'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
})
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()

const drawer = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const { user } = useAuthState()
const { fetchFlags, isEnabled } = useFeatureFlagsState()

onMounted(() => {
  fetchFlags()
})

const canViewUsers = computed(
  () => !!user.value && ([ROLES.ADMIN, ROLES.MANAGER] as UserRole[]).includes(user.value.role),
)
const isAdmin = computed(() => user.value?.role === ROLES.ADMIN)
const canViewConfig = computed(
  () =>
    !!user.value &&
    ([ROLES.ADMIN, ROLES.MANAGER, ROLES.HR] as UserRole[]).includes(user.value.role),
)
const canViewAttendance = computed(
  () =>
    !!user.value &&
    ([ROLES.ADMIN, ROLES.MANAGER, ROLES.HR] as UserRole[]).includes(
      user.value.role,
    ),
)
const canViewEmployees = computed(
  () =>
    !!user.value &&
    ([ROLES.ADMIN, ROLES.MANAGER, ROLES.HR] as UserRole[]).includes(
      user.value.role,
    ),
)
const canViewReports = canViewEmployees

const navItems = computed(() => [
  { title: 'Inicio', icon: 'mdi-home-outline', to: '/home' },
  ...((user.value?.role === ROLES.EMPLOYEE || user.value?.employeeId) &&
  isEnabled('self_service')
    ? [
        {
          title: 'Mi portal',
          icon: 'mdi-account-card-outline',
          to: '/portal',
        },
      ]
    : []),
  ...(canViewUsers.value
    ? [
        {
          title: 'Usuarios',
          icon: 'mdi-account-multiple-outline',
          to: '/admin/users',
        },
      ]
    : []),
  ...(isAdmin.value
    ? [
        {
          title: 'Emails',
          icon: 'mdi-email-multiple-outline',
          to: '/admin/emails',
        },
      ]
    : []),
  ...(canViewConfig.value
    ? [
        {
          title: 'Configuración',
          icon: 'mdi-office-building-outline',
          to: '/admin/configuration',
        },
      ]
    : []),
  ...(canViewAttendance.value && isEnabled('attendance')
    ? [
        {
          title: 'Asistencia',
          icon: 'mdi-clock-in',
          to: '/admin/attendance',
        },
      ]
    : []),
  ...(canViewAttendance.value && isEnabled('shifts')
    ? [
        {
          title: 'Turnos',
          icon: 'mdi-calendar-clock-outline',
          to: '/admin/shifts',
        },
      ]
    : []),
  ...(canViewAttendance.value && isEnabled('absences')
    ? [
        {
          title: 'Ausencias',
          icon: 'mdi-calendar-edit-outline',
          to: '/admin/ausencias',
        },
      ]
    : []),
  ...(canViewAttendance.value && isEnabled('loans')
    ? [
        {
          title: 'Préstamos',
          icon: 'mdi-hand-coin-outline',
          to: '/admin/loans',
        },
      ]
    : []),
  ...(canViewConfig.value && isEnabled('contracts')
    ? [
        {
          title: 'Contratos',
          icon: 'mdi-file-document-multiple-outline',
          to: '/admin/contracts',
        },
      ]
    : []),
  ...(canViewConfig.value && isEnabled('performance')
    ? [
        {
          title: 'Evaluaciones',
          icon: 'mdi-clipboard-check-outline',
          to: '/admin/evaluations',
        },
      ]
    : []),
  ...(canViewEmployees.value && isEnabled('employees')
    ? [
        {
          title: 'Empleados',
          icon: 'mdi-account-group-outline',
          to: '/admin/employees',
        },
      ]
    : []),
  ...(canViewAttendance.value && isEnabled('payroll')
    ? [
        {
          title: 'Nómina',
          icon: 'mdi-cash-multiple',
          to: '/admin/payroll',
        },
      ]
    : []),
  ...(canViewReports.value && isEnabled('analytics')
    ? [{ title: 'Reportes', icon: 'mdi-chart-bar', to: '/reports' }]
    : []),
  { title: 'Ayuda', icon: 'mdi-help-circle-outline', to: '/help' },
])
</script>

<template>
  <v-navigation-drawer v-model="drawer" width="260" class="bg-surface" app>
    <v-list nav>
      <v-list-item density="compact">
        <v-list-item-title class="text-h6">SUITE RH</v-list-item-title>
      </v-list-item>

      <v-divider class="my-2" />

      <v-list-item
        v-for="item in navItems"
        :key="item.title"
        :to="item.to"
        clickable
        rounded="lg"
        variant="text"
        density="compact"
        color="primary"
      >
        <template #prepend>
          <v-icon>{{ item.icon }}</v-icon>
        </template>
        <v-list-item-title>{{ item.title }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>
