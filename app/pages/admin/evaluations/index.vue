<script setup lang="ts">
import { ROLES, type UserRole } from '~~/shared/auth'
import { API_PATHS } from '~/utils/api-paths'
import type { IEvaluationView } from '~/composables/states/useEvaluationState'

definePageMeta({ middleware: 'auth' })

const { user, authFetch } = useAuthState()
useModuleGuard()
const snackbar = useSnackbarState()

const tab = ref(0)
const loading = ref(false)
const error = ref('')
const statusFilter = ref('')

const canApprove = computed(() => {
  const role = user.value?.role as UserRole | undefined
  return !!role && [ROLES.ADMIN, ROLES.MANAGER].includes(role)
})
const isAdmin = computed(() => user.value?.role === ROLES.ADMIN)
const canManageCampaigns = computed(() => {
  const role = user.value?.role as UserRole | undefined
  return !!role && [ROLES.ADMIN, ROLES.HR].includes(role)
})

const {
  evaluations,
  templates,
  fetchEvaluations,
  createEvaluation,
  approveEvaluation,
  fetchTemplates,
  fetchTemplateByPosition,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} = useEvaluationState()

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  completed: 'Completada',
  approved: 'Aprobada',
}

const statusColor = (status: string) =>
  status === 'approved' ? 'success' : status === 'completed' ? 'info' : 'warning'

const loadEvaluations = async () => {
  loading.value = true
  error.value = ''
  try {
    await fetchEvaluations({
      status: statusFilter.value || undefined,
      limit: 100,
    })
  } catch {
    error.value = 'No se pudieron cargar las evaluaciones.'
  } finally {
    loading.value = false
  }
}

const loadTemplates = async () => {
  loading.value = true
  error.value = ''
  try {
    await fetchTemplates()
  } catch {
    error.value = 'No se pudieron cargar las plantillas.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadEvaluations()
  loadTemplates()
  loadCatalogs()
  loadCampaigns()
})

const onTabChange = (value: number | string) => {
  if (String(value) === 'templates') loadTemplates()
}

// ---- Nueva evaluación ----
const newDialog = ref(false)
const newSaving = ref(false)
const newForm = ref({
  employeeId: '',
  periodLabel: '',
  positionId: '',
})
const employeeOptions = ref<Array<{ title: string; value: string }>>([])
const employeeManagerById = new Map<string, string>()
const positionOptions = ref<Array<{ title: string; value: string }>>([])
const templateWarning = ref('')
const evaluatorRule = ref<'manager' | 'manual'>('manager')

const loadCatalogs = async () => {
  try {
    const employees = await authFetch<{
      items: Array<{
        _id: string
        firstName: string
        lastName: string
        position: string
        manager?: { _id?: string } | string | null
      }>
    }>(API_PATHS.employees.list, { query: { limit: 100, active: 'true' } })
    employeeOptions.value = employees.items.map((employee) => ({
      title: `${employee.firstName} ${employee.lastName}`,
      value: employee._id,
      position: employee.position ?? '',
    }))
    for (const employee of employees.items) {
      const manager = employee.manager
      const managerId =
        manager && typeof manager === 'object'
          ? (manager._id ?? '')
          : typeof manager === 'string'
            ? manager
            : ''
      if (managerId) employeeManagerById.set(employee._id, managerId)
    }
    try {
      const config = await authFetch<{ evaluatorRule?: string } | null>(
        API_PATHS.evaluations.config,
      )
      if (config?.evaluatorRule) {
        evaluatorRule.value = config.evaluatorRule as 'manager' | 'manual'
      }
    } catch {
      // Usa la regla por defecto.
    }
    const positions = await authFetch<{
      items: Array<{ id: string; title: string }>
    }>(API_PATHS.organization.positions)
    positionOptions.value = positions.items.map((position) => ({
      title: position.title,
      value: position.id,
    }))
    const departments = await authFetch<{
      items: Array<{ id: string; name: string }>
    }>(API_PATHS.organization.departments)
    departmentOptions.value = departments.items.map((department) => ({
      title: department.name,
      value: department.id,
    }))
  } catch {
    // Catálogos vacíos.
  }
}

const openNewEvaluation = () => {
  newForm.value = { employeeId: '', periodLabel: '', positionId: '' }
  templateWarning.value = ''
  newDialog.value = true
}

const onPositionChange = async () => {
  templateWarning.value = ''
  if (!newForm.value.positionId) return
  try {
    const template = await fetchTemplateByPosition(newForm.value.positionId)
    if (!template) {
      templateWarning.value =
        'Este cargo no tiene una plantilla activa. Créala primero en la pestaña Plantillas.'
    }
  } catch {
    templateWarning.value = 'No se pudo validar la plantilla del cargo.'
  }
}

const selectedEmployeePosition = computed(() => {
  const employee = employeeOptions.value.find(
    (option) => option.value === newForm.value.employeeId,
  )
  return employee?.position ?? ''
})

const onEmployeeChange = async () => {
  newForm.value.positionId = ''
  templateWarning.value = ''
  const positionTitle = selectedEmployeePosition.value
  if (!positionTitle) return
  const position = positionOptions.value.find(
    (option) => option.title.toLowerCase() === positionTitle.toLowerCase(),
  )
  if (!position) {
    templateWarning.value = `El cargo "${positionTitle}" no está en el catálogo de cargos.`
    return
  }
  newForm.value.positionId = position.value
  await onPositionChange()
}

const createNewEvaluation = async () => {
  if (!newForm.value.employeeId || !newForm.value.periodLabel.trim()) return
  newSaving.value = true
  error.value = ''
  try {
    const template = newForm.value.positionId
      ? await fetchTemplateByPosition(newForm.value.positionId)
      : null
    if (!template) {
      templateWarning.value =
        'Este cargo no tiene una plantilla activa. Créala primero en la pestaña Plantillas.'
      return
    }
    const sections = (template.sections ?? []).map((section: Record<string, any>) => ({
      sectionId: section.id,
      sectionTitle: section.title,
      sectionWeight: section.weight,
      items: (section.items ?? []).map((item: Record<string, any>) => ({
        itemId: item.id,
        description: item.description,
        score: null,
      })),
    }))
    const result = await createEvaluation({
      employeeId: newForm.value.employeeId,
      evaluatorId:
        evaluatorRule.value === 'manager'
          ? (employeeManagerById.get(newForm.value.employeeId) ?? null)
          : null,
      periodLabel: newForm.value.periodLabel.trim(),
      templateId: template.id,
      positionId: newForm.value.positionId,
      sections,
    })
    newDialog.value = false
    snackbar.success('Evaluación creada en borrador')
    await navigateTo(`/admin/evaluations/${result.id}`)
  } catch {
    error.value = 'No se pudo crear la evaluación.'
  } finally {
    newSaving.value = false
  }
}

const doApprove = async (evaluation: IEvaluationView) => {
  if (!confirm(`¿Aprobar la evaluación de ${evaluation.employee}?`)) return
  try {
    await approveEvaluation(evaluation.id)
    snackbar.success('Evaluación aprobada')
    await loadEvaluations()
  } catch {
    error.value = 'No se pudo aprobar la evaluación.'
  }
}

// ---- Campañas de evaluación ----
const departmentOptions = ref<Array<{ title: string; value: string }>>([])
const campaigns = ref<Array<Record<string, any>>>([])

const campaignStatusOptions = [
  { title: 'Borrador', value: 'draft' },
  { title: 'Activa', value: 'active' },
  { title: 'Cerrada', value: 'closed' },
]

const scopeLabel = (scope: string) =>
  scope === 'areas' ? 'Áreas específicas' : 'Todas las áreas'

const campaignStatusColor = (status: string) =>
  status === 'active' ? 'success' : status === 'closed' ? 'grey' : 'warning'

const loadCampaigns = async () => {
  try {
    const data = await authFetch<{ items: Array<Record<string, any>> }>(
      API_PATHS.evaluations.campaigns,
    )
    campaigns.value = data.items
  } catch {
    error.value = 'No se pudieron cargar las campañas.'
  }
}

const campaignDialog = ref(false)
const campaignSaving = ref(false)
const campaignForm = ref({
  id: '',
  name: '',
  description: '',
  status: 'draft',
  startDate: '',
  endDate: '',
  dueDate: '',
  scope: 'all',
  areaIds: [] as string[],
  evaluatorRule: 'manager',
  allowSelfEvaluation: false,
})

const openCampaign = (campaign?: Record<string, any>) => {
  campaignForm.value = campaign
    ? {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description ?? '',
        status: campaign.status ?? 'draft',
        startDate: campaign.startDate ? String(campaign.startDate).slice(0, 10) : '',
        endDate: campaign.endDate ? String(campaign.endDate).slice(0, 10) : '',
        dueDate: campaign.dueDate ? String(campaign.dueDate).slice(0, 10) : '',
        scope: campaign.scope ?? 'all',
        areaIds: campaign.areaIds ?? [],
        evaluatorRule: campaign.evaluatorRule ?? 'manager',
        allowSelfEvaluation: campaign.allowSelfEvaluation ?? false,
      }
    : {
        id: '',
        name: '',
        description: '',
        status: 'draft',
        startDate: '',
        endDate: '',
        dueDate: '',
        scope: 'all',
        areaIds: [],
        evaluatorRule: 'manager',
        allowSelfEvaluation: false,
      }
  campaignDialog.value = true
}

const saveCampaign = async () => {
  if (!campaignForm.value.name.trim()) return
  campaignSaving.value = true
  error.value = ''
  try {
    const payload = { ...campaignForm.value }
    delete payload.id
    await authFetch(
      campaignForm.value.id
        ? API_PATHS.evaluations.campaign(campaignForm.value.id)
        : API_PATHS.evaluations.campaigns,
      {
        method: campaignForm.value.id ? 'PUT' : 'POST',
        body: payload,
      },
    )
    snackbar.success(
      campaignForm.value.id ? 'Campaña actualizada' : 'Campaña creada',
    )
    campaignDialog.value = false
    await loadCampaigns()
  } catch (err) {
    error.value =
      (err as { data?: { message?: string } })?.data?.message ??
      'No se pudo guardar la campaña.'
  } finally {
    campaignSaving.value = false
  }
}

const generateCampaign = async (campaign: Record<string, any>) => {
  if (!confirm(`¿Generar las evaluaciones de "${campaign.name}"?`)) return
  try {
    const result = await authFetch<{
      created: number
      skippedNoTemplate: number
      skippedExisting: number
    }>(API_PATHS.evaluations.campaignGenerate(campaign.id), {
      method: 'POST',
    })
    snackbar.success(
      `${result.created} evaluación(es) generada(s)` +
        (result.skippedExisting
          ? ` · ${result.skippedExisting} ya existían`
          : '') +
        (result.skippedNoTemplate
          ? ` · ${result.skippedNoTemplate} sin plantilla`
          : ''),
    )
    await loadCampaigns()
    await loadEvaluations()
  } catch (err) {
    error.value =
      (err as { data?: { message?: string } })?.data?.message ??
      'No se pudo generar.'
  }
}

const deleteCampaign = async (campaign: Record<string, any>) => {
  if (!confirm(`¿Eliminar la campaña "${campaign.name}"?`)) return
  try {
    await authFetch(API_PATHS.evaluations.campaign(campaign.id), {
      method: 'DELETE',
    })
    snackbar.success('Campaña eliminada')
    await loadCampaigns()
  } catch {
    error.value = 'No se pudo eliminar la campaña.'
  }
}

const campaignHistoryDialog = ref(false)
const campaignHistory = ref<Array<Record<string, any>>>([])

const showCampaignHistory = async (campaign: Record<string, any>) => {
  try {
    const data = await authFetch<{ items: Array<Record<string, any>> }>(
      API_PATHS.evaluations.campaignHistory(campaign.id),
    )
    campaignHistory.value = data.items
    campaignHistoryDialog.value = true
  } catch {
    error.value = 'No se pudo cargar el historial de la campaña.'
  }
}

// ---- Plantillas ----
let idCounter = 0
const uid = () => `sec_${++idCounter}_${Date.now()}`

const templateDialog = ref(false)
const templateSaving = ref(false)
const templateForm = ref({
  id: '',
  name: '',
  description: '',
  positionId: '',
  active: true,
})
const templateSections = ref<
  Array<{
    id: string
    title: string
    description: string
    order: number
    weight: number
    items: Array<{ id: string; description: string; order: number }>
  }>
>([])

const totalWeight = computed(() =>
  templateSections.value.reduce((sum, section) => sum + (section.weight || 0), 0),
)
const weightValid = computed(() => totalWeight.value === 100)

const distributeWeights = () => {
  const count = templateSections.value.length
  if (count === 0) return
  const base = Math.floor(100 / count)
  const remainder = 100 - base * count
  templateSections.value.forEach((section, index) => {
    section.weight = base + (index === count - 1 ? remainder : 0)
  })
}

const newSection = () => ({
  id: uid(),
  title: '',
  description: '',
  order: templateSections.value.length,
  weight: 0,
  items: [{ id: uid(), description: '', order: 0 }],
})

const addSection = () => {
  templateSections.value.push(newSection())
  distributeWeights()
}

const removeSection = (index: number) => {
  templateSections.value.splice(index, 1)
  distributeWeights()
}

const addItem = (sectionIndex: number) => {
  const section = templateSections.value[sectionIndex]
  section.items.push({
    id: uid(),
    description: '',
    order: section.items.length,
  })
}

const removeItem = (sectionIndex: number, itemIndex: number) => {
  templateSections.value[sectionIndex].items.splice(itemIndex, 1)
}

const openTemplate = (template?: Record<string, any>) => {
  templateForm.value = template
    ? {
        id: template.id,
        name: template.name,
        description: template.description,
        positionId: template.positionId,
        active: template.active,
      }
    : { id: '', name: '', description: '', positionId: '', active: true }
  templateSections.value = template?.sections?.length
    ? (template.sections as Array<Record<string, any>>).map(
        (section: Record<string, any>, index: number) => ({
          id: section.id || uid(),
          title: section.title ?? '',
          description: section.description ?? '',
          order: section.order ?? index,
          weight: section.weight ?? 0,
          items: (section.items ?? []).map(
            (item: Record<string, any>, itemIndex: number) => ({
              id: item.id || uid(),
              description: item.description ?? '',
              order: item.order ?? itemIndex,
            }),
          ),
        }),
      )
    : [newSection()]
  distributeWeights()
  templateDialog.value = true
}

const saveTemplate = async () => {
  if (!templateForm.value.name.trim() || !templateForm.value.positionId) return
  if (!weightValid.value) {
    error.value = `Los pesos deben sumar 100 (actual: ${totalWeight.value}).`
    return
  }
  templateSaving.value = true
  error.value = ''
  try {
    const payload = {
      name: templateForm.value.name.trim(),
      description: templateForm.value.description.trim(),
      positionId: templateForm.value.positionId,
      active: templateForm.value.active,
      sections: templateSections.value.map((section, index) => ({
        id: section.id,
        title: section.title.trim(),
        description: section.description.trim(),
        order: index,
        weight: section.weight,
        items: section.items
          .filter((item) => item.description.trim())
          .map((item, itemIndex) => ({
            id: item.id,
            description: item.description.trim(),
            order: itemIndex,
          })),
      })),
    }
    if (templateForm.value.id) {
      await updateTemplate(templateForm.value.id, payload)
      snackbar.success('Plantilla actualizada')
    } else {
      await createTemplate(payload)
      snackbar.success('Plantilla creada')
    }
    templateDialog.value = false
    await loadTemplates()
  } catch (err) {
    error.value =
      (err as { data?: { message?: string } })?.data?.message ??
      'No se pudo guardar la plantilla.'
  } finally {
    templateSaving.value = false
  }
}

const doDeleteTemplate = async (template: Record<string, any>) => {
  if (!confirm(`¿Eliminar la plantilla "${template.name}"?`)) return
  try {
    await deleteTemplate(template.id)
    snackbar.success('Plantilla eliminada')
    await loadTemplates()
  } catch {
    error.value = 'No se pudo eliminar la plantilla.'
  }
}

const evaluationHeaders = [
  { title: 'Empleado', key: 'employee' },
  { title: 'Período', key: 'periodLabel' },
  { title: 'Puntaje', key: 'overallScore' },
  { title: 'Estado', key: 'status' },
  { title: '', key: 'actions', sortable: false },
]

const templateHeaders = [
  { title: 'Nombre', key: 'name' },
  { title: 'Cargo', key: 'position' },
  { title: 'Secciones', key: 'sectionsCount' },
  { title: 'Estado', key: 'active' },
  { title: '', key: 'actions', sortable: false },
]
</script>

<template>
  <div>
    <CommonPageHeader
      title="Evaluaciones de desempeño"
      subtitle="Plantillas configurables por cargo y evaluaciones con flujo de aprobación"
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

    <v-tabs v-model="tab" density="comfortable" class="mb-4" @update:model-value="onTabChange">
      <v-tab value="campaigns" prepend-icon="mdi-bullhorn-outline">
        Campañas
      </v-tab>
      <v-tab value="evaluations" prepend-icon="mdi-clipboard-check-outline">
        Evaluaciones
      </v-tab>
      <v-tab value="templates" prepend-icon="mdi-file-document-multiple-outline">
        Plantillas
      </v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <v-window-item value="campaigns">
        <div class="d-flex justify-end mb-3">
          <v-btn
            v-if="canManageCampaigns"
            color="primary"
            variant="tonal"
            prepend-icon="mdi-plus"
            @click="openCampaign()"
          >
            Crear campaña
          </v-btn>
        </div>
        <v-data-table
          :headers="[
            { title: 'Campaña', key: 'name' },
            { title: 'Estado', key: 'status' },
            { title: 'Alcance', key: 'scope' },
            { title: 'Inicio', key: 'startDate' },
            { title: 'Límite', key: 'dueDate' },
            { title: 'Generadas', key: 'generatedCount' },
            { title: '', key: 'actions', sortable: false },
          ]"
          :items="campaigns"
          density="compact"
          items-per-page="10"
        >
          <template #[`item.name`]="{ item }">
            <v-btn
              variant="plain"
              color="primary"
              class="px-0 text-none font-weight-medium"
              :to="`/admin/evaluations/campaigns/${item.id}`"
            >
              {{ item.name }}
            </v-btn>
          </template>
          <template #[`item.status`]="{ item }">
            <v-chip
              size="small"
              :color="campaignStatusColor(item.status)"
              variant="tonal"
              label
            >
              {{
                campaignStatusOptions.find((opt) => opt.value === item.status)
                  ?.title ?? item.status
              }}
            </v-chip>
          </template>
          <template #[`item.scope`]="{ item }">
            {{ scopeLabel(item.scope) }}
          </template>
          <template #[`item.startDate`]="{ item }">
            {{ formatDate(item.startDate) }}
          </template>
          <template #[`item.dueDate`]="{ item }">
            {{ formatDate(item.dueDate) }}
          </template>
          <template #[`item.generatedCount`]="{ item }">
            <strong>{{ item.generatedCount }}</strong>
          </template>
          <template #[`item.actions`]="{ item }">
            <v-btn
              size="small"
              variant="text"
              color="primary"
              :to="`/admin/evaluations/campaigns/${item.id}`"
            >
              Ver
            </v-btn>
            <v-btn
              v-if="canManageCampaigns && item.status !== 'closed'"
              size="small"
              variant="text"
              color="success"
              @click="generateCampaign(item)"
            >
              Generar
            </v-btn>
            <v-btn
              v-if="canManageCampaigns"
              icon="mdi-pencil"
              size="small"
              variant="text"
              @click="openCampaign(item)"
            />
            <v-btn
              icon="mdi-history"
              size="small"
              variant="text"
              @click="showCampaignHistory(item)"
            />
            <v-btn
              v-if="canManageCampaigns"
              icon="mdi-delete"
              size="small"
              variant="text"
              color="error"
              @click="deleteCampaign(item)"
            />
          </template>
          <template #no-data>No hay campañas creadas.</template>
        </v-data-table>
      </v-window-item>

      <!-- Evaluaciones -->
      <v-window-item value="evaluations">
        <CommonListToolbar hide-search :loading="loading">
          <template #filters>
            <v-select
              v-model="statusFilter"
              :items="[
                { title: 'Todos', value: '' },
                { title: 'Borrador', value: 'draft' },
                { title: 'Completada', value: 'completed' },
                { title: 'Aprobada', value: 'approved' },
              ]"
              label="Estado"
              style="max-width: 180px"
              @update:model-value="loadEvaluations()"
            />
          </template>
          <template #actions>
            <v-btn
              color="primary"
              variant="tonal"
              prepend-icon="mdi-plus"
              @click="openNewEvaluation"
            >
              Nueva evaluación
            </v-btn>
          </template>
        </CommonListToolbar>
        <v-data-table
          :headers="evaluationHeaders"
          :items="evaluations"
          :loading="loading"
          density="compact"
          items-per-page="10"
        >
          <template #[`item.employee`]="{ item }">
            <v-btn
              variant="plain"
              color="primary"
              class="px-0 text-none font-weight-medium"
              :to="`/admin/evaluations/${item.id}`"
            >
              {{ item.employee }}
            </v-btn>
          </template>
          <template #[`item.overallScore`]="{ item }">
            <strong>{{ item.overallScore.toFixed(1) }}</strong>
          </template>
          <template #[`item.status`]="{ item }">
            <v-chip size="small" :color="statusColor(item.status)" variant="tonal" label>
              {{ STATUS_LABELS[item.status] ?? item.status }}
            </v-chip>
          </template>
          <template #[`item.actions`]="{ item }">
            <v-btn
              size="small"
              variant="text"
              color="primary"
              :to="`/admin/evaluations/${item.id}`"
            >
              Ver
            </v-btn>
            <v-btn
              v-if="item.status === 'completed' && canApprove"
              size="small"
              variant="text"
              color="success"
              @click="doApprove(item)"
            >
              Aprobar
            </v-btn>
          </template>
          <template #no-data>No hay evaluaciones registradas.</template>
        </v-data-table>
      </v-window-item>

      <!-- Plantillas -->
      <v-window-item value="templates">
        <CommonListToolbar hide-search :loading="loading">
          <template #actions>
            <v-btn
              v-if="isAdmin"
              color="primary"
              variant="tonal"
              prepend-icon="mdi-plus"
              @click="openTemplate()"
            >
              Nueva plantilla
            </v-btn>
          </template>
        </CommonListToolbar>
        <v-data-table
          :headers="templateHeaders"
          :items="templates"
          :loading="loading"
          density="compact"
          items-per-page="10"
        >
          <template #[`item.sectionsCount`]="{ item }">
            {{ item.sections.length }}
          </template>
          <template #[`item.active`]="{ item }">
            <v-chip size="small" :color="item.active ? 'success' : 'grey'" variant="tonal" label>
              {{ item.active ? 'Activa' : 'Inactiva' }}
            </v-chip>
          </template>
          <template #[`item.actions`]="{ item }">
            <v-btn
              v-if="isAdmin"
              icon="mdi-pencil"
              size="small"
              variant="text"
              @click="openTemplate(item)"
            />
            <v-btn
              v-if="isAdmin"
              icon="mdi-delete"
              size="small"
              variant="text"
              color="error"
              @click="doDeleteTemplate(item)"
            />
          </template>
          <template #no-data>No hay plantillas creadas.</template>
        </v-data-table>
      </v-window-item>
    </v-window>

    <!-- Diálogo campaña -->
    <v-dialog v-model="campaignDialog" max-width="640" persistent>
      <v-card>
        <v-card-title class="text-subtitle-1 font-weight-bold">
          {{ campaignForm.id ? 'Editar campaña' : 'Crear campaña de evaluaciones' }}
        </v-card-title>
        <v-divider />
        <v-card-text class="pt-4">
          <v-text-field
            v-model="campaignForm.name"
            label="Nombre de la campaña * (ej. Semestre 2026-1)"
            class="mb-3"
          />
          <v-text-field
            v-model="campaignForm.description"
            label="Descripción"
            class="mb-3"
          />
          <v-select
            v-model="campaignForm.status"
            :items="campaignStatusOptions"
            label="Estado"
            class="mb-3"
          />
          <v-row>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="campaignForm.startDate"
                label="Inicio"
                type="date"
                class="mb-3"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="campaignForm.endDate"
                label="Fin"
                type="date"
                class="mb-3"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="campaignForm.dueDate"
                label="Fecha límite"
                type="date"
                class="mb-3"
              />
            </v-col>
          </v-row>
          <v-select
            v-model="campaignForm.scope"
            :items="[
              { title: 'Todas las áreas', value: 'all' },
              { title: 'Áreas específicas', value: 'areas' },
            ]"
            label="Alcance"
            class="mb-3"
          />
          <v-select
            v-if="campaignForm.scope === 'areas'"
            v-model="campaignForm.areaIds"
            :items="departmentOptions"
            label="Áreas incluidas"
            multiple
            clearable
            class="mb-3"
          />
          <v-select
            v-model="campaignForm.evaluatorRule"
            :items="[
              { title: 'Jefe directo del empleado', value: 'manager' },
              { title: 'Asignación manual (RRHH)', value: 'manual' },
            ]"
            label="Quién evalúa"
            class="mb-3"
          />
          <v-switch
            v-model="campaignForm.allowSelfEvaluation"
            label="Permitir autoevaluación"
            color="primary"
            inset
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="campaignDialog = false">Cancelar</v-btn>
          <v-btn
            color="primary"
            variant="tonal"
            :loading="campaignSaving"
            :disabled="!campaignForm.name.trim()"
            @click="saveCampaign"
          >
            Guardar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Historial de campaña -->
    <v-dialog v-model="campaignHistoryDialog" max-width="640">
      <v-card>
        <v-card-title class="text-subtitle-1 font-weight-bold">
          Historial de la campaña
        </v-card-title>
        <v-divider />
        <v-card-text>
          <div v-if="campaignHistory.length === 0" class="text-center pa-6">
            <p class="text-body-2 text-medium-emphasis mb-0">Sin movimientos registrados.</p>
          </div>
          <v-timeline v-else side="end" density="compact">
            <v-timeline-item
              v-for="entry in campaignHistory"
              :key="entry.id"
              dot-color="primary"
              size="small"
            >
              <div class="text-body-2 font-weight-medium">{{ entry.description }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ entry.userName || 'Usuario' }} · {{ formatDate(entry.createdAt) }}
              </div>
            </v-timeline-item>
          </v-timeline>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="campaignHistoryDialog = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo nueva evaluación -->
    <v-dialog v-model="newDialog" max-width="560" persistent>
      <v-card>
        <v-card-title class="text-subtitle-1 font-weight-bold">
          Nueva evaluación
        </v-card-title>
        <v-divider />
        <v-card-text class="pt-4">
          <v-alert
            v-if="templateWarning"
            type="warning"
            variant="tonal"
            density="compact"
            class="mb-4"
            :text="templateWarning"
          />
          <v-autocomplete
            v-model="newForm.employeeId"
            :items="employeeOptions"
            label="Empleado *"
            class="mb-3"
            @update:model-value="onEmployeeChange"
          />
          <v-text-field
            v-model="newForm.periodLabel"
            label="Período * (ej. 2026 – Semestre 1)"
            class="mb-3"
          />
          <v-text-field
            :model-value="selectedEmployeePosition || 'Selecciona el empleado'"
            label="Cargo (del empleado)"
            readonly
            class="mb-3"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="newDialog = false">Cancelar</v-btn>
          <v-btn
            color="primary"
            variant="tonal"
            :loading="newSaving"
            :disabled="!newForm.employeeId || !newForm.periodLabel.trim() || !newForm.positionId"
            @click="createNewEvaluation"
          >
            Crear
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo plantilla -->
    <v-dialog v-model="templateDialog" max-width="760" persistent>
      <v-card>
        <v-card-title class="text-subtitle-1 font-weight-bold">
          {{ templateForm.id ? 'Editar plantilla' : 'Nueva plantilla' }}
        </v-card-title>
        <v-divider />
        <v-card-text class="pt-4">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="templateForm.name"
                label="Nombre de la plantilla *"
                class="mb-3"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="templateForm.positionId"
                :items="positionOptions"
                label="Cargo *"
                class="mb-3"
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="templateForm.description"
                label="Descripción"
                class="mb-3"
              />
            </v-col>
          </v-row>

          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-body-2 font-weight-bold">Secciones</span>
            <div class="d-flex ga-2">
              <v-chip size="small" :color="weightValid ? 'success' : 'error'" variant="tonal">
                Pesos: {{ totalWeight }}%
              </v-chip>
              <v-btn size="small" variant="text" color="primary" @click="distributeWeights">
                Repartir pesos
              </v-btn>
              <v-btn size="small" variant="tonal" color="primary" prepend-icon="mdi-plus" @click="addSection">
                Sección
              </v-btn>
            </div>
          </div>

          <div
            v-for="(section, sectionIndex) in templateSections"
            :key="section.id"
            class="pa-3 mb-3"
            style="border: 1px solid rgba(15,23,42,0.1); border-radius: 12px"
          >
            <div class="d-flex align-center ga-2 mb-2">
              <v-text-field
                v-model="section.title"
                label="Título de la sección"
                density="compact"
                hide-details
                class="flex-grow-1"
              />
              <v-text-field
                v-model.number="section.weight"
                label="Peso %"
                type="number"
                density="compact"
                hide-details
                style="max-width: 110px"
              />
              <v-btn
                icon="mdi-arrow-up"
                size="small"
                variant="text"
                :disabled="sectionIndex === 0"
                @click="
                  templateSections.splice(
                    sectionIndex - 1,
                    0,
                    templateSections.splice(sectionIndex, 1)[0],
                  )
                "
              />
              <v-btn
                icon="mdi-arrow-down"
                size="small"
                variant="text"
                :disabled="sectionIndex === templateSections.length - 1"
                @click="
                  templateSections.splice(
                    sectionIndex + 1,
                    0,
                    templateSections.splice(sectionIndex, 1)[0],
                  )
                "
              />
              <v-btn
                icon="mdi-delete"
                size="small"
                variant="text"
                color="error"
                @click="removeSection(sectionIndex)"
              />
            </div>
            <v-text-field
              v-model="section.description"
              label="Descripción (opcional)"
              density="compact"
              hide-details
              class="mb-2"
            />
            <div
              v-for="(item, itemIndex) in section.items"
              :key="item.id"
              class="d-flex align-center ga-2 mb-1"
            >
              <v-text-field
                v-model="item.description"
                :label="`Item ${itemIndex + 1}`"
                density="compact"
                hide-details
                class="flex-grow-1"
              />
              <v-btn
                icon="mdi-close"
                size="x-small"
                variant="text"
                @click="removeItem(sectionIndex, itemIndex)"
              />
            </div>
            <v-btn
              size="small"
              variant="text"
              color="primary"
              prepend-icon="mdi-plus"
              class="mt-1"
              @click="addItem(sectionIndex)"
            >
              Item
            </v-btn>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="templateDialog = false">Cancelar</v-btn>
          <v-btn
            color="primary"
            variant="tonal"
            :loading="templateSaving"
            :disabled="!templateForm.name.trim() || !templateForm.positionId || !weightValid"
            @click="saveTemplate"
          >
            Guardar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
