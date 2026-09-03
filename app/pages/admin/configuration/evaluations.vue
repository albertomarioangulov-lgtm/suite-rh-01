<script setup lang="ts">
import { ROLES, type UserRole } from '~~/shared/auth'
import { API_PATHS } from '~/utils/api-paths'

definePageMeta({ middleware: 'auth' })

const { user, authFetch } = useAuthState()
useModuleGuard()
const snackbar = useSnackbarState()

const canEdit = computed(() => {
  const role = user.value?.role as UserRole | undefined
  return !!role && [ROLES.ADMIN, ROLES.HR, ROLES.SUPERADMIN].includes(role)
})

const tab = ref(0)
const loading = ref(false)
const saving = ref(false)
const error = ref('')

const form = ref({
  enabled: true,
  frequency: 'semiannual',
  cycleStart: '',
  cycleEnd: '',
  cycleDue: '',
  scope: 'all',
  areaIds: [] as string[],
  evaluatorRule: 'manager',
  allowSelfEvaluation: false,
  comment: '',
})

const departmentOptions = ref<Array<{ title: string; value: string }>>([])
const history = ref<Array<Record<string, any>>>([])

const frequencyOptions = [
  { title: 'Mensual', value: 'monthly' },
  { title: 'Trimestral', value: 'quarterly' },
  { title: 'Semestral', value: 'semiannual' },
  { title: 'Anual', value: 'annual' },
  { title: 'Personalizado', value: 'custom' },
]

const scopeOptions = [
  { title: 'Todas las áreas', value: 'all' },
  { title: 'Áreas específicas', value: 'areas' },
]

const evaluatorRuleOptions = [
  { title: 'Jefe directo del empleado', value: 'manager' },
  { title: 'Asignación manual (RRHH)', value: 'manual' },
]

const loadConfig = async () => {
  loading.value = true
  try {
    const config = await authFetch<Record<string, any> | null>(
      API_PATHS.evaluations.config,
    )
    if (config) {
      form.value = {
        enabled: config.enabled ?? true,
        frequency: config.frequency ?? 'semiannual',
        cycleStart: config.cycleStart
          ? String(config.cycleStart).slice(0, 10)
          : '',
        cycleEnd: config.cycleEnd ? String(config.cycleEnd).slice(0, 10) : '',
        cycleDue: config.cycleDue ? String(config.cycleDue).slice(0, 10) : '',
        scope: config.scope ?? 'all',
        areaIds: config.areaIds ?? [],
        evaluatorRule: config.evaluatorRule ?? 'manager',
        allowSelfEvaluation: config.allowSelfEvaluation ?? false,
        comment: '',
      }
    }
    const departments = await authFetch<{ items: Array<{ id: string; name: string }> }>(
      API_PATHS.organization.departments,
    )
    departmentOptions.value = departments.items.map((department) => ({
      title: department.name,
      value: department.id,
    }))
  } catch {
    error.value = 'No se pudo cargar la configuración.'
  } finally {
    loading.value = false
  }
}

const loadHistory = async () => {
  try {
    const data = await authFetch<{ items: Array<Record<string, any>> }>(
      API_PATHS.evaluations.configHistory,
    )
    history.value = data.items
  } catch {
    error.value = 'No se pudo cargar el historial.'
  }
}

const saveConfig = async () => {
  if (!canEdit.value) return
  saving.value = true
  error.value = ''
  try {
    await authFetch(API_PATHS.evaluations.config, {
      method: 'PUT',
      body: { ...form.value },
    })
    snackbar.success('Configuración guardada y versionada')
    await loadConfig()
    await loadHistory()
  } catch (err) {
    error.value =
      (err as { data?: { message?: string } })?.data?.message ??
      'No se pudo guardar la configuración.'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadConfig()
  loadHistory()
})

const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString('es-CO') : '—'

</script>

<template>
  <div>
    <CommonPageHeader
      title="Evaluaciones de desempeño"
      subtitle="Configuración del ciclo, alcance y reglas de evaluación con historial"
    />

    <v-alert
      v-if="error"
      type="error"
      density="compact"
      variant="tonal"
      class="mb-3"
      :text="error"
      closable
      @click:close="error = ''"
    />

    <v-tabs v-model="tab" density="comfortable" class="mb-4">
      <v-tab value="config" prepend-icon="mdi-tune-variant">Parámetros generales</v-tab>
      <v-tab value="history" prepend-icon="mdi-history">Historial</v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <v-window-item value="config">
        <v-card elevation="0" rounded="xl" style="border: 1px solid rgba(15,23,42,0.08)">
          <v-card-text class="pa-6">
            <v-skeleton-loader v-if="loading" type="article, actions" />
            <template v-else>
              <v-switch
                v-model="form.enabled"
                label="Módulo de evaluaciones activo"
                color="primary"
                inset
                class="mb-2"
                :disabled="!canEdit"
              />

              <h3 class="text-subtitle-1 font-weight-bold mb-3">Ciclo de evaluación</h3>
              <v-row>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="form.frequency"
                    :items="frequencyOptions"
                    label="Frecuencia"
                    :disabled="!canEdit"
                    class="mb-3"
                  />
                </v-col>
                <v-col cols="12" md="6" />
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="form.cycleStart"
                    label="Inicio del ciclo"
                    type="date"
                    :disabled="!canEdit"
                    class="mb-3"
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="form.cycleEnd"
                    label="Fin del ciclo"
                    type="date"
                    :disabled="!canEdit"
                    class="mb-3"
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="form.cycleDue"
                    label="Fecha límite"
                    type="date"
                    :disabled="!canEdit"
                    class="mb-3"
                  />
                </v-col>
              </v-row>

              <h3 class="text-subtitle-1 font-weight-bold mb-3">Alcance y evaluadores</h3>
              <v-row>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="form.scope"
                    :items="scopeOptions"
                    label="Alcance"
                    :disabled="!canEdit"
                    class="mb-3"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="form.evaluatorRule"
                    :items="evaluatorRuleOptions"
                    label="Quién evalúa"
                    :disabled="!canEdit"
                    class="mb-3"
                  />
                </v-col>
                <v-col v-if="form.scope === 'areas'" cols="12">
                  <v-select
                    v-model="form.areaIds"
                    :items="departmentOptions"
                    label="Áreas incluidas"
                    multiple
                    clearable
                    :disabled="!canEdit"
                    class="mb-3"
                  />
                </v-col>
                <v-col cols="12">
                  <v-switch
                    v-model="form.allowSelfEvaluation"
                    label="Permitir autoevaluación del empleado"
                    color="primary"
                    inset
                    :disabled="!canEdit"
                  />
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    v-model="form.comment"
                    label="Motivo del cambio (queda en el historial)"
                    :disabled="!canEdit"
                    class="mb-3"
                  />
                </v-col>
              </v-row>

              <div class="d-flex justify-end">
                <v-btn
                  v-if="canEdit"
                  color="primary"
                  variant="flat"
                  :loading="saving"
                  @click="saveConfig"
                >
                  Guardar configuración
                </v-btn>
              </div>
            </template>
          </v-card-text>
        </v-card>
      </v-window-item>

      <v-window-item value="history">
        <v-card elevation="0" rounded="xl" style="border: 1px solid rgba(15,23,42,0.08)">
          <v-card-text>
            <div v-if="history.length === 0" class="text-center pa-8">
              <v-icon size="48" color="grey-lighten-1" class="mb-3">mdi-history</v-icon>
              <p class="text-body-2 text-medium-emphasis mb-0">
                Aún no hay cambios registrados en la configuración.
              </p>
            </div>
            <v-timeline v-else side="end" density="compact">
              <v-timeline-item
                v-for="entry in history"
                :key="entry.id"
                dot-color="primary"
                size="small"
              >
                <v-card elevation="0" style="border: 1px solid rgba(15,23,42,0.08)" class="mb-3">
                  <v-card-text>
                    <div class="d-flex align-center justify-space-between flex-wrap ga-2">
                      <div class="text-subtitle-2 font-weight-bold">
                        {{ entry.userName || 'Usuario' }}
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        {{ formatDate(entry.createdAt) }}
                      </div>
                    </div>
                    <p v-if="entry.comment" class="text-body-2 text-medium-emphasis mb-2">
                      {{ entry.comment }}
                    </p>
                    <v-expansion-panels variant="accordion">
                      <v-expansion-panel>
                        <v-expansion-panel-title class="text-caption">
                          Ver detalle antes / después
                        </v-expansion-panel-title>
                        <v-expansion-panel-text>
                          <pre class="text-caption" style="white-space: pre-wrap">{{ JSON.stringify(entry.changes, null, 2) }}</pre>
                        </v-expansion-panel-text>
                      </v-expansion-panel>
                    </v-expansion-panels>
                  </v-card-text>
                </v-card>
              </v-timeline-item>
            </v-timeline>
          </v-card-text>
        </v-card>
      </v-window-item>
    </v-window>

  </div>
</template>
