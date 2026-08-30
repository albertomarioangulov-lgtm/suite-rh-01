<script setup lang="ts">
import { ROLES, type UserRole } from '~~/shared/auth'
import type { IPayrollView } from '~/composables/states/usePayrollState'
import { PayrollTable } from '#components'

definePageMeta({
  middleware: 'auth',
})

const { user } = useAuthState()
useModuleGuard()
const snackbar = useSnackbarState()
const {
  payrolls,
  total,
  loading,
  error,
  fetchPayrolls,
  createPayroll,
  approvePayroll,
  payPayroll,
  cancelPayroll,
} = usePayrollState()

const role = computed(() => user.value?.role)
const canManage = computed(
  () =>
    !!role.value &&
    ([ROLES.ADMIN, ROLES.MANAGER, ROLES.HR] as UserRole[]).includes(role.value),
)
const canApprove = computed(
  () => !!role.value && [ROLES.ADMIN, ROLES.MANAGER].includes(role.value),
)
const canPay = computed(() => role.value === ROLES.ADMIN)

const statusFilter = ref('')
const options = ref({ page: 1, itemsPerPage: 10 })
const createOpen = ref(false)

const load = async () => {
  try {
    await fetchPayrolls({
      page: options.value.page,
      limit: options.value.itemsPerPage,
      status: statusFilter.value || undefined,
    })
  } catch {
    // Error visible en el VAlert.
  }
}

const onUpdateOptions = (value: unknown) => {
  const next = value as Partial<typeof options.value>
  options.value = { ...options.value, ...next }
  load()
}

onMounted(load)

const onCreated = async (data: { periodStart: string; periodEnd: string }) => {
  try {
    await createPayroll(data)
    snackbar.success('Nómina creada en borrador')
    await load()
  } catch {
    // Error visible en el VAlert.
  }
}

const run = async (
  fn: (id: string) => Promise<unknown>,
  id: string,
  message: string,
) => {
  try {
    await fn(id)
    snackbar.success(message)
    await load()
  } catch {
    // Error visible en el VAlert.
  }
}

const handleView = (payroll: IPayrollView) =>
  navigateTo(`/admin/payroll/${payroll._id}`)
</script>

<template>
  <div>
    <CommonPageHeader
      title="Nómina"
      subtitle="Liquidación de períodos y pagos"
    >
      <template #actions>
        <v-btn
          v-if="canManage"
          color="primary"
          variant="tonal"
          prepend-icon="mdi-plus"
          @click="createOpen = true"
        >
          Nueva nómina
        </v-btn>
      </template>
    </CommonPageHeader>

    <div v-if="canManage" class="position-relative">
      <v-progress-linear
        v-if="loading"
        indeterminate
        color="primary"
        height="4"
        class="position-absolute top-0 left-0 right-0"
        style="z-index: 1"
      />
      <CommonListToolbar hide-search :loading="loading">
        <template #filters>
          <v-select
            v-model="statusFilter"
            :items="[
              { title: 'Todos', value: '' },
              { title: 'Borrador', value: 'draft' },
              { title: 'Aprobada', value: 'approved' },
              { title: 'Pagada', value: 'paid' },
              { title: 'Anulada', value: 'cancelled' },
            ]"
            label="Estado"
            style="max-width: 180px"
            @update:model-value="statusFilter = $event; options.page = 1; load()"
          />
        </template>
      </CommonListToolbar>
    </div>

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

    <v-card v-if="canManage" class="overflow-hidden">
      <PayrollTable
        :items="payrolls"
        :total="total"
        :loading="false"
        :page="options.page"
        :items-per-page="options.itemsPerPage"
        :can-approve="canApprove"
        :can-pay="canPay"
        :can-cancel="canPay"
        @update:options="onUpdateOptions"
        @view="handleView"
        @approve="(p) => run(approvePayroll, p._id, 'Nómina aprobada')"
        @pay="(p) => run(payPayroll, p._id, 'Nómina pagada')"
        @cancel="(p) => run(cancelPayroll, p._id, 'Nómina anulada')"
      />
    </v-card>

    <v-alert
      v-else
      type="warning"
      variant="tonal"
      text="No tienes permisos para ver la nómina."
    />

    <PayrollFormDialog
      v-model="createOpen"
      @saved="onCreated"
    />
  </div>
</template>
