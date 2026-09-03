<script setup lang="ts">
import { ROLES } from '~~/shared/auth'
import { API_BASE } from '~/utils/api-paths'
import { FEATURE_FLAG_LIST } from '~~/shared/feature-flags'
import { FEATURE_FLAG_LABELS, useFeatureFlagsState } from '~/composables/states/useFeatureFlagsState'

definePageMeta({ middleware: 'auth' })

const { user, isSuperAdmin, authFetch } = useAuthState()
const snackbar = useSnackbarState()
const { enabledFlags, loading, error, fetchFlags } = useFeatureFlagsState()

const isAdmin = computed(() => user.value?.role === ROLES.ADMIN || user.value?.role === ROLES.SUPERADMIN)
const saving = ref(false)
const companyConfigured = ref<boolean | null>(null)
const requests = ref<
  Array<{
    id: string
    module: string
    message: string
    status: string
    createdAt?: string
  }>
>([])
const handlingRequest = ref<string | null>(null)

onMounted(() => {
  fetchFlags()
  loadCompany()
  if (isSuperAdmin.value) loadRequests()
})

const loadRequests = async () => {
  try {
    const data = await authFetch<{ items: typeof requests.value }>(
      `${API_BASE}/module-requests`,
    )
    requests.value = data.items ?? []
  } catch {
    requests.value = []
  }
}

const handleRequest = async (request: { id: string; module: string }) => {
  handlingRequest.value = request.id
  try {
    await authFetch(`${API_BASE}/module-requests/${request.id}`, {
      method: 'PUT',
      body: { status: 'handled' },
    })
    snackbar.success('Solicitud marcada como atendida')
    await loadRequests()
  } catch {
    snackbar.error('No se pudo actualizar la solicitud')
  } finally {
    handlingRequest.value = null
  }
}

const loadCompany = async () => {
  try {
    const company = await authFetch<{ _id?: string } | null>(
      `${API_BASE}/company`,
    )
    companyConfigured.value = Boolean(company?._id)
  } catch {
    companyConfigured.value = false
  }
}

const isEnabled = (flag: string) => enabledFlags.value.includes(flag as never)

const toggle = async (flag: string, enabled: boolean) => {
  saving.value = true
  try {
    await authFetch(`${API_BASE}/flags`, {
      method: 'PUT',
      body: { flag, enabled },
    })
    await fetchFlags()
    snackbar.success('Módulo actualizado')
  } catch (err) {
    const apiError = err as
      | { data?: { message?: string }; message?: string }
      | null
    const message =
      apiError?.data?.message ||
      apiError?.message ||
      'No se pudo actualizar el módulo'
    snackbar.error(message)
    if (message.includes('Sin empresa activa')) {
      companyConfigured.value = false
    }
  } finally {
    saving.value = false
  }
}

const descriptions: Record<string, string> = {
  employees: 'Fichas de empleados, contratos y salarios.',
  attendance: 'Registro de entradas, salidas y horas extras.',
  shifts: 'Turnos fijos o rotativos y calendario.',
  absences: 'Permisos, licencias, incapacidades y descansos.',
  payroll: 'Liquidación de nómina y aprobación.',
  loans: 'Préstamos a empleados y descuentos de nómina.',
  analytics: 'Dashboard de indicadores y reportes.',
  performance: 'Evaluación de desempeño (en desarrollo).',
  recruitment: 'Reclutamiento y selección (en desarrollo).',
  contracts: 'Contratos laborales e historial de vinculación (en desarrollo).',
  self_service: 'Portal de autoservicio (en desarrollo).',
}
</script>

<template>
  <div>
    <CommonPageHeader
      title="Módulos y licencias"
      subtitle="Activa o desactiva los módulos del sistema para esta empresa"
    />

    <CommonConfigurationTabs />

    <v-alert
      v-if="error"
      type="error"
      density="compact"
      variant="tonal"
      class="mb-4"
      :text="error"
      closable
      @click:close="error = ''"
    />

    <v-alert
      v-if="!isAdmin && !isSuperAdmin"
      type="info"
      variant="tonal"
      density="compact"
      class="mb-4"
      text="Solo los administradores pueden activar o desactivar módulos."
    />

    <v-alert
      v-if="isAdmin && !isSuperAdmin"
      type="info"
      variant="tonal"
      density="compact"
      class="mb-4"
      text="La activación de módulos corresponde al plan/licencia y la gestiona el super administrador (AMAV). Aquí puedes ver qué módulos están activos para la empresa."
    />

    <v-alert
      v-if="isSuperAdmin && companyConfigured === false"
      type="warning"
      variant="tonal"
      density="compact"
      class="mb-4"
      title="Primero configura la empresa"
    >
      <div class="d-flex align-center ga-2 flex-wrap">
        <span>
          Los módulos se activan por empresa. Guarda primero los datos del
          cliente en Configuración → Empresa.
        </span>
        <v-btn
          variant="tonal"
          color="primary"
          size="small"
          prepend-icon="mdi-office-building-outline"
          to="/admin/configuration"
        >
          Ir a Empresa
        </v-btn>
      </div>
    </v-alert>

    <v-card v-if="isSuperAdmin && requests.length" class="mb-4">
      <v-card-item>
        <v-card-title class="text-subtitle-1 font-weight-bold">
          Solicitudes de activación
        </v-card-title>
        <v-card-subtitle class="text-caption">
          Pendientes de los clientes; resuelve activando el módulo desde aquí.
        </v-card-subtitle>
      </v-card-item>
      <v-divider />
      <v-list density="compact">
        <v-list-item
          v-for="request in requests.filter((item) => item.status === 'pending')"
          :key="request.id"
          :title="FEATURE_FLAG_LABELS[request.module as keyof typeof FEATURE_FLAG_LABELS] ?? request.module"
          :subtitle="request.message || 'Sin detalle'"
        >
          <template #append>
            <v-btn
              size="small"
              variant="tonal"
              color="primary"
              :loading="handlingRequest === request.id"
              @click="handleRequest(request)"
            >
              Marcar atendida
            </v-btn>
          </template>
        </v-list-item>
      </v-list>
    </v-card>

    <v-card :loading="loading">
      <v-card-item>
        <v-card-title class="text-subtitle-1 font-weight-bold">
          Feature flags del tenant
        </v-card-title>
        <v-card-subtitle class="text-caption">
          Los módulos marcados como "(en desarrollo)" se habilitarán cuando
          estén construidos o cuando la licencia externa los otorgue.
        </v-card-subtitle>
      </v-card-item>
      <v-divider />
      <v-list density="compact">
        <v-list-item
          v-for="flag in FEATURE_FLAG_LIST"
          :key="flag"
          :title="FEATURE_FLAG_LABELS[flag]"
          :subtitle="descriptions[flag]"
        >
          <template #append>
            <v-switch
              :model-value="isEnabled(flag)"
              color="primary"
              density="compact"
              hide-details
              :disabled="!isSuperAdmin || saving"
              @update:model-value="toggle(flag, $event)"
            />
          </template>
        </v-list-item>
      </v-list>
    </v-card>
  </div>
</template>
