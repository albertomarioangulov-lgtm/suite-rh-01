<script setup lang="ts">
import { ROLES, type UserRole } from '~~/shared/auth'
import { API_PATHS } from '~/utils/api-paths'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const evaluationId = computed(() => String(route.params.id))

const { user, authFetch } = useAuthState()
useModuleGuard()
const snackbar = useSnackbarState()
const { generating: pdfGenerating, downloadPdf } = useEvaluationPdf()

const evaluation = ref<Record<string, any> | null>(null)
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const companyLogo = ref('')
const paperSize = ref<'carta' | 'oficio' | 'a4' | 'auto'>('carta')

const paperOptions = [
  { value: 'carta', label: 'Carta' },
  { value: 'oficio', label: 'Oficio' },
  { value: 'a4', label: 'A4' },
  { value: 'auto', label: 'Auto' },
]

const canApprove = computed(() => {
  const role = user.value?.role as UserRole | undefined
  return !!role && [ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPERADMIN].includes(role)
})

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  completed: 'Completada',
  approved: 'Aprobada',
}

const statusColor = (status: string) =>
  status === 'approved' ? 'success' : status === 'completed' ? 'info' : 'warning'

const NIVELES = [
  { valor: 1, label: '1', color: 'red', descripcion: 'Deficiente' },
  { valor: 2, label: '2', color: 'orange', descripcion: 'Regular' },
  { valor: 3, label: '3', color: 'warning', descripcion: 'Bueno' },
  { valor: 4, label: '4', color: 'light-blue', descripcion: 'Muy bueno' },
  { valor: 5, label: '5', color: 'green', descripcion: 'Excelente' },
]

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    evaluation.value = await authFetch<Record<string, any>>(
      API_PATHS.evaluations.detail(evaluationId.value),
    )
    try {
      const company = await authFetch<{ logo?: string }>(
        API_PATHS.company.config,
      )
      companyLogo.value = company?.logo ?? ''
    } catch {
      companyLogo.value = ''
    }
  } catch {
    error.value = 'No se pudo cargar la evaluación.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

const isApproved = computed(() => evaluation.value?.status === 'approved')

const setScore = (sectionIndex: number, itemIndex: number, value: number | null) => {
  const sections = evaluation.value?.sections ?? []
  sections[sectionIndex].items[itemIndex].score = value
}

const nivelColor = (score: number | null): string =>
  NIVELES.find((nivel) => nivel.valor === score)?.color ?? 'grey'

const nivelDescription = (score: number | null): string =>
  NIVELES.find((nivel) => nivel.valor === score)?.descripcion ?? ''

const previewScore = computed(() => {
  const sections = evaluation.value?.sections ?? []
  let total = 0
  for (const section of sections) {
    const scores = (section.items ?? [])
      .map((item: Record<string, any>) => item.score)
      .filter((score: unknown): score is number => typeof score === 'number')
    if (scores.length === 0) continue
    const average = scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length
    total += (average / 5) * (section.sectionWeight ?? 0)
  }
  return Math.round(total * 100) / 100
})

const save = async (status: 'draft' | 'completed') => {
  if (!evaluation.value) return
  saving.value = true
  error.value = ''
  try {
    const result = await authFetch<{ success: boolean; overallScore: number }>(
      API_PATHS.evaluations.detail(evaluationId.value),
      {
        method: 'PUT',
        body: {
          sections: evaluation.value.sections,
          recommendations: evaluation.value.recommendations ?? '',
          actionPlan: evaluation.value.actionPlan ?? '',
          status,
        },
      },
    )
    snackbar.success(status === 'completed' ? 'Evaluación completada' : 'Borrador guardado')
    await load()
    if (result.overallScore !== undefined) {
      evaluation.value.overallScore = result.overallScore
    }
  } catch (err) {
    error.value =
      (err as { data?: { message?: string } })?.data?.message ??
      'No se pudo guardar la evaluación.'
  } finally {
    saving.value = false
  }
}

const approve = async () => {
  if (!confirm('¿Aprobar esta evaluación? Quedará bloqueada.')) return
  saving.value = true
  try {
    await authFetch<{ success: boolean }>(
      API_PATHS.evaluations.approve(evaluationId.value),
      { method: 'PUT' },
    )
    snackbar.success('Evaluación aprobada')
    await load()
  } catch (err) {
    error.value =
      (err as { data?: { message?: string } })?.data?.message ??
      'No se pudo aprobar.'
  } finally {
    saving.value = false
  }
}

const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString('es-CO') : '—'

const handleDownload = async () => {
  if (!evaluation.value) return
  try {
    await downloadPdf(evaluation.value, companyLogo.value, paperSize.value)
  } catch (err) {
    snackbar.error(
      (err as { message?: string })?.message ??
        'No se pudo generar el PDF. Revisa la consola.',
    )
  }
}
</script>

<template>
  <div>
    <v-skeleton-loader v-if="loading" type="article, actions" />

    <template v-else-if="evaluation">
      <CommonPageHeader
        :title="`Evaluación · ${evaluation.employeeName}`"
        :subtitle="`${evaluation.employeePosition || 'Sin cargo'} · ${evaluation.periodLabel}`"
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
          <v-btn-group class="ml-2" density="compact">
            <v-btn
              color="primary"
              variant="tonal"
              prepend-icon="mdi-file-pdf-box"
              :loading="pdfGenerating"
              :disabled="pdfGenerating"
              @click="handleDownload"
            >
              Descargar PDF
            </v-btn>
            <v-menu>
              <template #activator="{ props: menuProps }">
                <v-btn
                  v-bind="menuProps"
                  color="primary"
                  variant="tonal"
                  icon="mdi-menu-down"
                  :loading="pdfGenerating"
                  :disabled="pdfGenerating"
                  title="Tamaño de hoja"
                />
              </template>
              <v-list density="compact" min-width="180">
                <v-list-item
                  v-for="option in paperOptions"
                  :key="option.value"
                  :active="paperSize === option.value"
                  @click="paperSize = option.value"
                >
                  <v-list-item-title>{{ option.label }}</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </v-btn-group>
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
        <v-col cols="12" md="4">
          <v-card class="h-100">
            <v-card-text>
              <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-1">
                Puntaje total
              </div>
              <div class="text-h5 font-weight-bold">
                {{ previewScore.toFixed(1) }} / 100
              </div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="4">
          <v-card class="h-100">
            <v-card-text>
              <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-1">
                Estado
              </div>
              <v-chip :color="statusColor(evaluation.status)" variant="tonal" label>
                {{ STATUS_LABELS[evaluation.status] ?? evaluation.status }}
              </v-chip>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="4">
          <v-card class="h-100">
            <v-card-text>
              <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-1">
                Evaluador
              </div>
              <div class="text-subtitle-2">{{ evaluation.evaluator || '—' }}</div>
              <div v-if="evaluation.approvedBy" class="text-caption text-medium-emphasis">
                Aprobada por {{ evaluation.approvedBy }} · {{ formatDate(evaluation.approvedAt) }}
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Secciones -->
      <v-card
        v-for="(section, sectionIndex) in evaluation.sections"
        :key="section.sectionId"
        class="mb-4"
        elevation="0"
        style="border: 1px solid rgba(15,23,42,0.08)"
      >
        <v-card-item>
          <v-card-title class="text-subtitle-1 font-weight-bold">
            {{ section.sectionTitle || `Sección ${sectionIndex + 1}` }}
          </v-card-title>
          <v-card-subtitle>
            Peso: {{ section.sectionWeight }}%
          </v-card-subtitle>
        </v-card-item>
        <v-divider />
        <v-card-text>
          <v-row>
            <v-col
              v-for="(item, itemIndex) in section.items"
              :key="item.itemId"
              cols="12"
              md="6"
            >
              <div class="text-body-2 font-weight-medium mb-1">
                {{ itemIndex + 1 }}. {{ item.description || 'Item' }}
              </div>
              <v-chip
                v-if="isApproved"
                :color="nivelColor(item.score)"
                variant="flat"
                size="small"
                label
                class="mb-1"
              >
                <strong class="mr-1">{{ item.score ?? '—' }}</strong>
                <span v-if="item.score">{{ nivelDescription(item.score) }}</span>
              </v-chip>
              <v-chip-group
                v-else
                :model-value="item.score"
                :mandatory="false"
                column
                @update:model-value="setScore(sectionIndex, itemIndex, $event ?? null)"
              >
                <v-chip
                  v-for="nivel in NIVELES"
                  :key="nivel.valor"
                  :value="nivel.valor"
                  :color="item.score === nivel.valor ? nivel.color : 'grey'"
                  variant="tonal"
                  size="small"
                  filter
                >
                  {{ nivel.label }}
                </v-chip>
              </v-chip-group>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Recomendaciones y plan de acción -->
      <v-row density="compact" class="mb-4">
        <v-col cols="12" md="6">
          <v-card elevation="0" style="border: 1px solid rgba(15,23,42,0.08)">
            <v-card-text>
              <div class="text-subtitle-1 font-weight-bold mb-2">Recomendaciones</div>
              <v-textarea
                v-model="evaluation.recommendations"
                rows="4"
                variant="outlined"
                density="comfortable"
                :readonly="isApproved"
              />
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card elevation="0" style="border: 1px solid rgba(15,23,42,0.08)">
            <v-card-text>
              <div class="text-subtitle-1 font-weight-bold mb-2">Plan de acción</div>
              <v-textarea
                v-model="evaluation.actionPlan"
                rows="4"
                variant="outlined"
                density="comfortable"
                :readonly="isApproved"
              />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <div v-if="!isApproved" class="d-flex justify-end ga-2">
        <v-btn
          variant="tonal"
          :loading="saving"
          :disabled="saving"
          @click="save('draft')"
        >
          Guardar borrador
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="saving"
          :disabled="saving"
          @click="save('completed')"
        >
          Completar
        </v-btn>
        <v-btn
          v-if="evaluation.status === 'completed' && canApprove"
          color="success"
          variant="flat"
          :loading="saving"
          @click="approve"
        >
          Aprobar
        </v-btn>
      </div>
    </template>
  </div>
</template>
