<script setup lang="ts">
import { ROLES, type UserRole } from '~~/shared/auth'
import { API_PATHS } from '~/utils/api-paths'
import VChart from 'vue-echarts'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const campaignId = computed(() => String(route.params.id))

const { user, authFetch } = useAuthState()
useModuleGuard()
const snackbar = useSnackbarState()

const campaign = ref<Record<string, any> | null>(null)
const evaluations = ref<Array<Record<string, any>>>([])
const loading = ref(true)
const generating = ref(false)
const error = ref('')
const statusFilter = ref('')

const canManageCampaigns = computed(() => {
  const role = user.value?.role as UserRole | undefined
  return !!role && [ROLES.ADMIN, ROLES.HR].includes(role)
})
const canApprove = computed(() => {
  const role = user.value?.role as UserRole | undefined
  return !!role && [ROLES.ADMIN, ROLES.MANAGER].includes(role)
})

const STATUS_LABELS: Record<string, string> = {
  draft: 'Pendiente',
  completed: 'Completada',
  approved: 'Aprobada',
}

const statusColor = (status: string) =>
  status === 'approved' ? 'success' : status === 'completed' ? 'info' : 'warning'

const scopeLabel = (scope: string) =>
  scope === 'areas' ? 'Áreas específicas' : 'Todas las áreas'

const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString('es-CO') : '—'

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    campaign.value = await authFetch<Record<string, any>>(
      API_PATHS.evaluations.campaign(campaignId.value),
    )
    const data = await authFetch<{ items: Array<Record<string, any>> }>(
      API_PATHS.evaluations.list,
      {
        query: { periodLabel: campaign.value.name, limit: 200 },
      },
    )
    evaluations.value = data.items
  } catch {
    error.value = 'No se pudo cargar la campaña.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

const filteredEvaluations = computed(() =>
  statusFilter.value
    ? evaluations.value.filter((item) => item.status === statusFilter.value)
    : evaluations.value,
)

const stats = computed(() => {
  const total = evaluations.value.length
  const realizadas = evaluations.value.filter(
    (item) => item.status === 'completed' || item.status === 'approved',
  ).length
  const pendientes = total - realizadas
  return {
    total,
    realizadas,
    pendientes,
    progress: total > 0 ? Math.round((realizadas / total) * 100) : 0,
  }
})

const scoredEvaluations = computed(() =>
  evaluations.value.filter((item) => item.status !== 'draft'),
)

const averageScore = computed(() => {
  const scored = scoredEvaluations.value
  if (!scored.length) return 0
  return (
    scored.reduce((sum, item) => sum + Number(item.overallScore ?? 0), 0) /
    scored.length
  )
})

const approvedCount = computed(
  () => evaluations.value.filter((item) => item.status === 'approved').length,
)

const statusPieOption = computed(() => ({
  tooltip: { trigger: 'item' },
  legend: { bottom: 0, left: 'center' },
  series: [
    {
      type: 'pie',
      radius: ['45%', '72%'],
      center: ['50%', '45%'],
      data: [
        {
          name: 'Pendientes',
          value: stats.value.pendientes,
          itemStyle: { color: '#FB8C00' },
        },
        {
          name: 'Completadas',
          value: evaluations.value.filter((item) => item.status === 'completed')
            .length,
          itemStyle: { color: '#0EA5E9' },
        },
        {
          name: 'Aprobadas',
          value: approvedCount.value,
          itemStyle: { color: '#16A34A' },
        },
      ],
    },
  ],
}))

const areaBarOption = computed(() => {
  const map = new Map<string, { sum: number; count: number }>()
  for (const item of scoredEvaluations.value) {
    const key = item.areaName || 'Sin área'
    const entry = map.get(key) ?? { sum: 0, count: 0 }
    entry.sum += Number(item.overallScore ?? 0)
    entry.count++
    map.set(key, entry)
  }
  const entries = Array.from(map.entries()).sort(
    (a, b) => b[1].sum / b[1].count - a[1].sum / a[1].count,
  )
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 16, top: 24, bottom: 56 },
    xAxis: {
      type: 'category',
      data: entries.map(([name]) => name),
      axisLabel: { rotate: 20, width: 90, overflow: 'truncate' },
    },
    yAxis: { type: 'value', min: 0, max: 100 },
    series: [
      {
        type: 'bar',
        name: 'Promedio',
        data: entries.map(
          ([, value]) => Math.round((value.sum / value.count) * 10) / 10,
        ),
        itemStyle: { color: '#1867C0', borderRadius: [4, 4, 0, 0] },
      },
    ],
  }
})

const levelBarOption = computed(() => {
  const counts = [0, 0, 0, 0, 0]
  for (const item of scoredEvaluations.value) {
    const score = Number(item.overallScore ?? 0)
    if (score >= 90) counts[0]++
    else if (score >= 75) counts[1]++
    else if (score >= 60) counts[2]++
    else if (score >= 45) counts[3]++
    else counts[4]++
  }
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 16, top: 24, bottom: 24 },
    xAxis: {
      type: 'category',
      data: ['Excelente', 'Muy bueno', 'Bueno', 'Regular', 'Deficiente'],
    },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        type: 'bar',
        name: 'Evaluaciones',
        data: counts,
        itemStyle: {
          color: (params: { dataIndex: number }) =>
            ['#16A34A', '#48A9A6', '#FB8C00', '#E65100', '#DC2626'][
              params.dataIndex
            ],
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  }
})

const generate = async () => {
  if (!campaign.value) return
  if (!confirm(`¿Generar más evaluaciones para "${campaign.value.name}"?`)) return
  generating.value = true
  try {
    const result = await authFetch<{
      created: number
      skippedNoTemplate: number
      skippedExisting: number
    }>(API_PATHS.evaluations.campaignGenerate(campaignId.value), {
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
    await load()
  } catch (err) {
    error.value =
      (err as { data?: { message?: string } })?.data?.message ??
      'No se pudo generar.'
  } finally {
    generating.value = false
  }
}

const approve = async (evaluation: Record<string, any>) => {
  if (!confirm(`¿Aprobar la evaluación de ${evaluation.employee}?`)) return
  try {
    await authFetch(API_PATHS.evaluations.approve(evaluation.id), {
      method: 'PUT',
    })
    snackbar.success('Evaluación aprobada')
    await load()
  } catch (err) {
    error.value =
      (err as { data?: { message?: string } })?.data?.message ??
      'No se pudo aprobar.'
  }
}
</script>

<template>
  <div>
    <v-skeleton-loader v-if="loading" type="article, actions" />

    <template v-else-if="campaign">
      <CommonPageHeader
        :title="campaign.name"
        :subtitle="campaign.description || 'Campaña de evaluación de desempeño'"
      >
        <template #actions>
          <v-btn
            variant="text"
            color="grey-darken-1"
            prepend-icon="mdi-arrow-left"
            to="/admin/evaluations"
          >
            Volver
          </v-btn>
          <v-btn
            v-if="canManageCampaigns && campaign.status !== 'closed'"
            variant="tonal"
            color="success"
            prepend-icon="mdi-play"
            :loading="generating"
            @click="generate"
          >
            Generar evaluaciones
          </v-btn>
        </template>
      </CommonPageHeader>

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

      <!-- Resumen -->
      <v-row density="compact" class="mb-4">
        <v-col cols="6" lg="3">
          <v-card class="h-100">
            <v-card-text>
              <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-1">
                Evaluaciones
              </div>
              <div class="text-h5 font-weight-bold">{{ stats.total }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ scopeLabel(campaign.scope) }}
              </div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" lg="3">
          <v-card class="h-100">
            <v-card-text>
              <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-1">
                Realizadas
              </div>
              <div class="text-h5 font-weight-bold text-success">
                {{ stats.realizadas }}
              </div>
              <div class="text-caption text-medium-emphasis">Completadas o aprobadas</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" lg="3">
          <v-card class="h-100">
            <v-card-text>
              <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-1">
                Pendientes
              </div>
              <div class="text-h5 font-weight-bold text-warning">
                {{ stats.pendientes }}
              </div>
              <div class="text-caption text-medium-emphasis">En borrador</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" lg="3">
          <v-card class="h-100">
            <v-card-text>
              <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-1">
                Promedio
              </div>
              <div class="text-h5 font-weight-bold text-primary">
                {{ averageScore.toFixed(1) }} / 100
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ approvedCount }} aprobada(s) · de completadas/aprobadas
              </div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12">
          <v-card elevation="0" style="border: 1px solid rgba(15,23,42,0.08)">
            <v-card-text>
              <div class="d-flex justify-space-between text-caption text-medium-emphasis mb-1">
                <span>Avance de la campaña</span>
                <span>{{ stats.progress }}%</span>
              </div>
              <v-progress-linear
                :model-value="stats.progress"
                color="primary"
                height="10"
                rounded
              />
              <div class="text-caption text-medium-emphasis mt-2">
                Período: {{ formatDate(campaign.startDate) }} → {{ formatDate(campaign.endDate) }}
                · Límite: {{ formatDate(campaign.dueDate) }}
                · Evaluador: {{ campaign.evaluatorRule === 'manager' ? 'Jefe directo' : 'RRHH (manual)' }}
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Dashboard de la campaña -->
      <h2 class="text-subtitle-1 font-weight-bold mb-3">Estadísticas de la campaña</h2>
      <v-row density="compact" class="mb-4">
        <v-col cols="12" lg="4">
          <v-card class="h-100" elevation="0" style="border: 1px solid rgba(15,23,42,0.08)">
            <v-card-text>
              <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-2">
                Estado de las evaluaciones
              </div>
              <VChart :option="statusPieOption" autoresize style="height: 240px; width: 100%" />
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" lg="8">
          <v-card class="h-100" elevation="0" style="border: 1px solid rgba(15,23,42,0.08)">
            <v-card-text>
              <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-2">
                Promedio de puntaje por área
              </div>
              <VChart :option="areaBarOption" autoresize style="height: 240px; width: 100%" />
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12">
          <v-card elevation="0" style="border: 1px solid rgba(15,23,42,0.08)">
            <v-card-text>
              <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-2">
                Distribución por nivel
              </div>
              <VChart :option="levelBarOption" autoresize style="height: 220px; width: 100%" />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Listado -->
      <div class="d-flex align-center justify-space-between mb-3">
        <h2 class="text-subtitle-1 font-weight-bold mb-0">Evaluaciones de la campaña</h2>
        <v-select
          v-model="statusFilter"
          :items="[
            { title: 'Todas', value: '' },
            { title: 'Pendientes', value: 'draft' },
            { title: 'Completadas', value: 'completed' },
            { title: 'Aprobadas', value: 'approved' },
          ]"
          label="Estado"
          density="compact"
          hide-details
          style="max-width: 180px"
        />
      </div>

      <v-data-table
        :headers="[
          { title: 'Empleado', key: 'employee' },
          { title: 'Evaluador', key: 'evaluator' },
          { title: 'Estado', key: 'status' },
          { title: 'Puntaje', key: 'overallScore' },
          { title: '', key: 'actions', sortable: false },
        ]"
        :items="filteredEvaluations"
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
        <template #[`item.status`]="{ item }">
          <v-chip size="small" :color="statusColor(item.status)" variant="tonal" label>
            {{ STATUS_LABELS[item.status] ?? item.status }}
          </v-chip>
        </template>
        <template #[`item.overallScore`]="{ item }">
          <strong>{{ Number(item.overallScore ?? 0).toFixed(1) }}</strong>
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
            @click="approve(item)"
          >
            Aprobar
          </v-btn>
        </template>
        <template #no-data>
          Aún no hay evaluaciones para esta campaña. Usa "Generar evaluaciones" para crearlas.
        </template>
      </v-data-table>
    </template>
  </div>
</template>
