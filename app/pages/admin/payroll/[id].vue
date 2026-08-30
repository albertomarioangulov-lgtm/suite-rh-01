<script setup lang="ts">
import { ROLES } from '~~/shared/auth'
import { formatDate } from '~~/shared/utils/datetime-helpers'
import { formatCOP } from '~/utils/number-helpers'

definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const payrollId = computed(() => String(route.params.id))
const tab = ref('employees')

const { user: authUser } = useAuthState()
const snackbar = useSnackbarState()
const {
  currentPayroll,
  loading,
  error,
  fetchPayrollById,
  approvePayroll,
  payPayroll,
  cancelPayroll,
  recalculatePayroll,
  payrollHistory,
  fetchPayrollHistory,
} = usePayrollState()

const role = computed(() => authUser.value?.role)
const canApprove = computed(
  () => !!role.value && [ROLES.ADMIN, ROLES.MANAGER].includes(role.value),
)
const canPay = computed(() => role.value === ROLES.ADMIN)

const load = async () => {
  try {
    await fetchPayrollById(payrollId.value)
    await fetchPayrollHistory(payrollId.value)
  } catch {
    // Error visible en VAlert.
  }
}

watch(payrollId, load, { immediate: true })

const run = async (fn: (id: string) => Promise<unknown>, message: string) => {
  try {
    await fn(payrollId.value)
    snackbar.success(message)
    await load()
  } catch {
    // Error visible en VAlert.
  }
}

const historyMeta: Record<string, { icon: string; color: string; label: string }> = {
  create: { icon: 'mdi-plus-circle-outline', color: 'success', label: 'Creación' },
  update: { icon: 'mdi-pencil-outline', color: 'primary', label: 'Actualización' },
  recalculate: { icon: 'mdi-refresh', color: 'warning', label: 'Recálculo' },
  approve: { icon: 'mdi-check-circle-outline', color: 'success', label: 'Aprobación' },
  pay: { icon: 'mdi-cash', color: 'primary', label: 'Pago' },
  cancel: { icon: 'mdi-cancel', color: 'error', label: 'Anulación' },
}

const historyMetaOf = (action: string) => historyMeta[action] ?? historyMeta.update
</script>

<template>
  <div>
    <div class="d-flex align-center ga-2 mb-3">
      <v-btn
        icon="mdi-arrow-left"
        variant="text"
        @click="navigateTo('/admin/payroll')"
      />
      <h1 class="text-h6 font-weight-bold mt-0 mb-0">Detalle de nómina</h1>
      <v-spacer />
      <template v-if="currentPayroll">
        <v-btn
          v-if="canApprove && currentPayroll.status === 'draft'"
          variant="tonal"
          color="success"
          prepend-icon="mdi-check"
          @click="run(approvePayroll, 'Nómina aprobada')"
        >
          Aprobar
        </v-btn>
        <v-btn
          v-if="canPay && currentPayroll.status === 'approved'"
          variant="tonal"
          color="primary"
          prepend-icon="mdi-cash"
          @click="run(payPayroll, 'Nómina pagada')"
        >
          Pagar
        </v-btn>
        <v-btn
          v-if="canPay && ['draft', 'approved'].includes(currentPayroll.status)"
          variant="text"
          color="error"
          prepend-icon="mdi-cancel"
          @click="run(cancelPayroll, 'Nómina anulada')"
        >
          Anular
        </v-btn>
        <v-btn
          v-if="currentPayroll.status === 'draft'"
          variant="text"
          prepend-icon="mdi-refresh"
          @click="run(recalculatePayroll, 'Nómina recalculada')"
        >
          Recalcular
        </v-btn>
      </template>
    </div>

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

    <v-card v-if="currentPayroll" class="mb-4">
      <v-card-item>
        <template #prepend>
          <v-avatar color="primary" variant="tonal" size="48">
            <v-icon color="primary">mdi-cash-multiple</v-icon>
          </v-avatar>
        </template>
        <v-card-title class="text-h6 font-weight-bold">
          {{ formatDate(currentPayroll.periodStart, 'DD/MM/YYYY') }} –
          {{ formatDate(currentPayroll.periodEnd, 'DD/MM/YYYY') }}
        </v-card-title>
        <v-card-subtitle>
          {{ (currentPayroll.employees ?? []).length }} empleado(s)
        </v-card-subtitle>
        <template #append>
          <PayrollStatusBadge :status="currentPayroll.status" />
        </template>
      </v-card-item>
      <v-divider />
      <v-list>
        <v-list-item
          title="Total devengado"
          :subtitle="formatCOP(currentPayroll.totalEarned)"
          prepend-icon="mdi-account-cash-outline"
        />
        <v-list-item
          title="Total deducciones"
          :subtitle="formatCOP(currentPayroll.totalDeducted)"
          prepend-icon="mdi-cash-minus"
        >
          <template #append>
            <ClientOnly>
              <v-tooltip
                location="start"
                text="Salud 4% + Pensión 4% + Retención en la fuente + Embargos + Préstamos"
              >
                <template #activator="{ props }">
                  <v-icon
                    v-bind="props"
                    icon="mdi-information-outline"
                    size="small"
                    class="text-medium-emphasis"
                  />
                </template>
              </v-tooltip>
            </ClientOnly>
          </template>
        </v-list-item>
        <v-list-item
          title="Seguridad social (empleador)"
          :subtitle="formatCOP(currentPayroll.totalSocialSecurity)"
          prepend-icon="mdi-shield-account-outline"
        />
        <v-list-item
          title="Total a pagar"
          :subtitle="formatCOP(currentPayroll.totalToPay)"
          prepend-icon="mdi-cash-multiple"
        />
      </v-list>
    </v-card>

    <v-tabs v-model="tab" color="primary" class="mb-3">
      <v-tab value="employees" prepend-icon="mdi-account-group-outline">
        Empleados
      </v-tab>
      <v-tab value="history" prepend-icon="mdi-history">Historial</v-tab>
    </v-tabs>

    <v-row v-if="currentPayroll && tab === 'employees'">
      <v-col
        v-for="entry in currentPayroll.employees ?? []"
        :key="String(entry.employee?._id ?? entry.employee)"
        cols="12"
        sm="6"
        md="4"
      >
        <PayrollEmployeeSummary :entry="entry" />
      </v-col>
    </v-row>

    <div v-if="tab === 'history'">
      <v-timeline v-if="payrollHistory.length" side="end" density="compact">
        <v-timeline-item
          v-for="log in payrollHistory"
          :key="log._id"
          :icon="historyMetaOf(log.action).icon"
          :color="historyMetaOf(log.action).color"
          fill-dot
        >
          <v-card>
            <v-card-text>
              <div class="font-weight-bold">
                {{ historyMetaOf(log.action).label }}
              </div>
              <div class="text-body-2 mt-1">{{ log.description }}</div>
              <div class="text-caption text-medium-emphasis mt-1">
                {{ formatDate(log.createdAt, 'DD/MM/YYYY HH:mm') }} · {{ log.userName || '—' }}
              </div>
            </v-card-text>
          </v-card>
        </v-timeline-item>
      </v-timeline>
      <v-card v-else class="text-center pa-8">
        <p class="text-medium-emphasis">Aún no hay cambios registrados.</p>
      </v-card>
    </div>

    <v-card v-if="loading && !currentPayroll" max-width="640" class="mx-auto">
      <v-skeleton-loader type="list-item-two-line, divider, list-item-three-line" />
    </v-card>
  </div>
</template>
