<script setup lang="ts">
import { formatCOP } from '~/utils/number-helpers'
import { API_PATHS } from '~/utils/api-paths'

definePageMeta({ middleware: 'auth' })

const { authFetch } = useAuthState()
useModuleGuard()

interface IContractView {
  id: string
  employeeId: string
  employee: string
  document: string
  type: string
  startDate: string
  endDate: string | null
  salary: number
  position: string
  status: string
}

const contracts = ref<IContractView[]>([])
const loading = ref(false)
const error = ref('')
const statusFilter = ref('')

const STATUS_LABELS: Record<string, string> = {
  active: 'Vigente',
  expired: 'Vencido',
  terminated: 'Terminado',
  renewed: 'Renovado',
}

const TYPE_LABELS: Record<string, string> = {
  indefinite: 'Indefinido',
  fixed: 'Término fijo',
  work_labor: 'Obra o labor',
  intern: 'Práctica',
}

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const data = await authFetch<{ items: IContractView[] }>(
      API_PATHS.contracts.list,
      {
        query: {
          status: statusFilter.value || undefined,
          limit: 200,
        },
      },
    )
    contracts.value = data.items
  } catch {
    error.value = 'No se pudieron cargar los contratos.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

const headers = [
  { title: 'Empleado', key: 'employee' },
  { title: 'Documento', key: 'document' },
  { title: 'Tipo', key: 'type' },
  { title: 'Inicio', key: 'startDate' },
  { title: 'Fin', key: 'endDate' },
  { title: 'Salario', key: 'salary' },
  { title: 'Estado', key: 'status' },
  { title: '', key: 'actions', sortable: false },
]

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('es-CO') : '—'

const statusColor = (status: string) =>
  status === 'active' ? 'success' : status === 'expired' ? 'warning' : 'grey'
</script>

<template>
  <div>
    <CommonPageHeader
      title="Contratos"
      subtitle="Documentos contractuales, vigencia y renovaciones por empleado"
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

    <CommonListToolbar hide-search :loading="loading">
      <template #filters>
        <v-select
          v-model="statusFilter"
          :items="[
            { title: 'Todos', value: '' },
            { title: 'Vigentes', value: 'active' },
            { title: 'Vencidos', value: 'expired' },
            { title: 'Terminados', value: 'terminated' },
            { title: 'Renovados', value: 'renewed' },
          ]"
          label="Estado"
          style="max-width: 180px"
          @update:model-value="load()"
        />
      </template>
    </CommonListToolbar>

    <v-data-table
      :headers="headers"
      :items="contracts"
      :loading="loading"
      density="compact"
      items-per-page="10"
    >
      <template #[`item.employee`]="{ item }">
        <v-btn
          variant="plain"
          color="primary"
          class="px-0 text-none font-weight-medium"
          :to="`/admin/employees/${item.employeeId}`"
        >
          {{ item.employee }}
        </v-btn>
      </template>
      <template #[`item.type`]="{ item }">
        {{ TYPE_LABELS[item.type] ?? item.type }}
      </template>
      <template #[`item.startDate`]="{ item }">
        {{ formatDate(item.startDate) }}
      </template>
      <template #[`item.endDate`]="{ item }">
        {{ formatDate(item.endDate) }}
      </template>
      <template #[`item.salary`]="{ item }">
        {{ formatCOP(item.salary) }}
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
          :to="`/admin/employees/${item.employeeId}#contratos`"
        >
          Ver empleado
        </v-btn>
      </template>
    </v-data-table>
  </div>
</template>
