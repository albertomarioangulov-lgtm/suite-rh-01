<script setup lang="ts">
import { ROLES } from '~~/shared/auth'
import { API_BASE } from '~/utils/api-paths'

definePageMeta({
  middleware: 'auth',
})

const { user, authFetch } = useAuthState()
const snackbar = useSnackbarState()

interface IAlertRuleView {
  key: string
  label: string
  description: string
  enabled: boolean
  targetRoles: string[]
}

const isAdmin = computed(() => user.value?.role === ROLES.ADMIN)

const rules = ref<IAlertRuleView[]>([])
const pollingIntervalSeconds = ref(0)
const loading = ref(false)
const saving = ref(false)
const error = ref('')

const roleOptions = [
  { title: 'Administrador', value: 'admin' },
  { title: 'Gerente', value: 'manager' },
  { title: 'Recursos Humanos', value: 'hr' },
]

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const data = await authFetch<{
      rules: IAlertRuleView[]
      pollingIntervalSeconds?: number
    }>(
      `${API_BASE}/analytics/alert-config`,
    )
    rules.value = data.rules ?? []
    pollingIntervalSeconds.value = data.pollingIntervalSeconds ?? 0
  } catch {
    error.value = 'No se pudo cargar la configuración de alertas.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

const toggleRole = (rule: IAlertRuleView, role: string) => {
  const index = rule.targetRoles.indexOf(role)
  if (index >= 0) {
    rule.targetRoles.splice(index, 1)
  } else {
    rule.targetRoles.push(role)
  }
}

const save = async () => {
  saving.value = true
  error.value = ''
  try {
    await authFetch(`${API_BASE}/analytics/alert-config`, {
      method: 'PUT',
      body: { rules: rules.value, pollingIntervalSeconds: pollingIntervalSeconds.value },
    })
    snackbar.success('Configuración de alertas guardada')
  } catch {
    error.value = 'No se pudo guardar la configuración de alertas.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <CommonPageHeader
      title="Configuración de alertas"
      subtitle="Define qué alertas se generan y a qué roles les llegan"
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
      v-if="!isAdmin"
      type="info"
      variant="tonal"
      density="compact"
      class="mb-4"
      text="Solo los administradores pueden modificar la configuración de alertas."
    />

    <v-card :loading="loading">
      <v-card-item>
        <v-card-title class="text-subtitle-1 font-weight-bold">
          Actualización de alertas
        </v-card-title>
        <v-card-subtitle class="text-caption">
          Define cómo se actualiza la campana de alertas en el navegador.
        </v-card-subtitle>
      </v-card-item>
      <v-divider />
      <v-card-text>
        <v-radio-group
          v-model="pollingIntervalSeconds"
          :disabled="!isAdmin"
          density="compact"
        >
          <v-radio label="Al entrar o recargar la página (sin polling)" :value="0" />
          <v-radio label="Cada 30 segundos" :value="30" />
          <v-radio label="Cada 5 minutos" :value="300" />
        </v-radio-group>
      </v-card-text>
      <v-divider />
      <v-card-item>
        <v-card-title class="text-subtitle-1 font-weight-bold">
          Tipos de alerta y destinatarios
        </v-card-title>
        <v-card-subtitle class="text-caption">
          Una alerta solo llega a los roles marcados.
        </v-card-subtitle>
      </v-card-item>
      <v-divider />

      <v-table density="compact">
        <thead>
          <tr>
            <th>Alerta</th>
            <th class="text-center">Activa</th>
            <th>Destinatarios</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="rule in rules" :key="rule.key">
            <td>
              <div class="text-body-2 font-weight-medium">{{ rule.label }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ rule.description }}
              </div>
            </td>
            <td class="text-center">
              <v-switch
                v-model="rule.enabled"
                color="primary"
                density="compact"
                hide-details
                :disabled="!isAdmin"
              />
            </td>
            <td>
              <v-checkbox-btn
                v-for="option in roleOptions"
                :key="option.value"
                :model-value="rule.targetRoles.includes(option.value)"
                :label="option.title"
                density="compact"
                hide-details
                inline
                :disabled="!isAdmin"
                @update:model-value="toggleRole(rule, option.value)"
              />
            </td>
          </tr>
        </tbody>
      </v-table>

      <v-card-actions class="justify-end">
        <v-btn
          v-if="isAdmin"
          color="primary"
          variant="tonal"
          prepend-icon="mdi-content-save"
          :loading="saving"
          @click="save"
        >
          Guardar configuración
        </v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>
