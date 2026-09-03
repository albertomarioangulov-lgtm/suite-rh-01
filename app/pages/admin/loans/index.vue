<script setup lang="ts">
import { ROLES, type UserRole } from '~~/shared/auth'
import { formatCOP } from '~/utils/number-helpers'
import { API_PATHS } from '~/utils/api-paths'
import type { ILoanView } from '~/composables/states/useLoanState'

definePageMeta({ middleware: 'auth' })

const { user, authFetch } = useAuthState()
useModuleGuard()
const snackbar = useSnackbarState()
const {
  loans,
  loading,
  error,
  pagination,
  fetchLoans,
  createLoan,
} = useLoanState()

const canManage = computed(() => {
  const role = user.value?.role as UserRole | undefined
  return (
    !!role && ([ROLES.ADMIN, ROLES.MANAGER, ROLES.HR, ROLES.SUPERADMIN] as UserRole[]).includes(role)
  )
})

const options = ref({ page: 1, itemsPerPage: 10 })
const statusFilter = ref('')
const employeeOptions = ref<Array<{ title: string; value: string }>>([])
const employeeFilter = ref('')

onMounted(async () => {
  load()
  try {
    const data = await authFetch<{
      items: Array<{ _id: string; firstName: string; lastName: string; document: string }>
    }>(API_PATHS.employees.list, { query: { limit: 100, active: 'true' } })
    employeeOptions.value = data.items.map((employee) => ({
      title: `${employee.firstName} ${employee.lastName} (${employee.document})`,
      value: employee._id,
    }))
  } catch {
    // Silencioso.
  }
})

const load = async () => {
  try {
    await fetchLoans({
      page: options.value.page,
      limit: options.value.itemsPerPage,
      employeeId: employeeFilter.value || undefined,
      status: statusFilter.value || undefined,
    })
  } catch {
    // Error en VAlert.
  }
}

const onUpdateOptions = (value: unknown) => {
  const next = value as Partial<typeof options.value>
  options.value = { ...options.value, ...next }
  load()
}

const formOpen = ref(false)
const saving = ref(false)

const onSaved = async (data: Record<string, unknown>) => {
  saving.value = true
  try {
    await createLoan(data)
    formOpen.value = false
    snackbar.success('Préstamo creado')
    await load()
  } catch {
    // Error en VAlert.
  }
  saving.value = false
}

const employeeName = (loan: ILoanView) => {
  const employee = loan.employee
  if (typeof employee === 'object' && employee) {
    return `${employee.firstName} ${employee.lastName}`
  }
  return 'Empleado'
}

const headers = [
  { title: 'Empleado', key: 'employee' },
  { title: 'Descripción', key: 'description' },
  { title: 'Capital', key: 'principal' },
  { title: 'Cuota', key: 'installment' },
  { title: 'Saldo', key: 'balance' },
  { title: 'Estado', key: 'status' },
  { title: 'Acciones', key: 'actions', sortable: false },
]
</script>

<template>
  <div>
    <CommonPageHeader
      title="Préstamos"
      subtitle="Préstamos a empleados y descuentos automáticos de nómina"
    >
      <template #actions>
        <v-btn
          v-if="canManage"
          color="primary"
          variant="tonal"
          prepend-icon="mdi-plus"
          @click="formOpen = true"
        >
          Nuevo préstamo
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

    <CommonListToolbar hide-search :loading="loading">
      <template #filters>
        <v-autocomplete
          v-model="employeeFilter"
          :items="employeeOptions"
          label="Empleado"
          item-title="title"
          item-value="value"
          clearable
         
          style="max-width: 300px"
          @update:model-value="options.page = 1; load()"
        />
        <v-select
          v-model="statusFilter"
          :items="[
            { title: 'Todos', value: '' },
            { title: 'Activos', value: 'active' },
            { title: 'Pagados', value: 'paid' },
            { title: 'Cancelados', value: 'cancelled' },
          ]"
          label="Estado"
         
          style="max-width: 180px"
          @update:model-value="options.page = 1; load()"
        />
      </template>
    </CommonListToolbar>

    <v-data-table-server
        :headers="headers"
        :items="loans"
        :loading="false"
        :items-length="pagination.total"
        :items-per-page="options.itemsPerPage"
        :page="options.page"
        :items-per-page-options="[5, 10, 25, 50]"
        @update:options="onUpdateOptions"
      >
        <template #[`item.employee`]="{ item }">
          <v-btn
            variant="plain"
            color="primary"
            class="px-0 text-none font-weight-medium"
            :to="`/admin/loans/${item._id}`"
          >
            {{ employeeName(item) }}
          </v-btn>
        </template>
        <template #[`item.principal`]="{ item }">
          {{ formatCOP(item.principal) }}
        </template>
        <template #[`item.installment`]="{ item }">
          {{ formatCOP(item.installment) }}
        </template>
        <template #[`item.balance`]="{ item }">
          <span class="font-weight-medium">{{ formatCOP(item.balance) }}</span>
        </template>
        <template #[`item.status`]="{ item }">
          <LoanStatusBadge :status="item.status" />
        </template>
        <template #[`item.actions`]="{ item }">
          <v-btn
            icon
            size="small"
            variant="text"
            :to="`/admin/loans/${item._id}`"
            title="Ver detalle"
          >
            <v-icon>mdi-eye-outline</v-icon>
          </v-btn>
        </template>
    </v-data-table-server>

    <v-dialog v-model="formOpen" max-width="640" persistent>
      <v-card>
        <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center ga-2">
          <v-icon color="primary">mdi-hand-coin-outline</v-icon>
          Nuevo préstamo
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="formOpen = false" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pt-4">
          <LoanForm
            v-if="formOpen"
            @saved="onSaved"
            @cancel="formOpen = false"
            @saving-change="saving = $event"
          />
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>
