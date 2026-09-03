<script setup lang="ts">
import { ROLES } from '~~/shared/auth'
import { formatCOP } from '~/utils/number-helpers'
import { formatDate } from '~~/shared/utils/datetime-helpers'
import { useLoanState } from '~/composables/states/useLoanState'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const loanId = computed(() => String(route.params.id))
const { user } = useAuthState()
const snackbar = useSnackbarState()
const { currentLoan, error, fetchLoanById, addPayment, updateLoan } =
  useLoanState()

const canManage = computed(() =>
  [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR, ROLES.SUPERADMIN].includes(user.value?.role as never),
)

const paymentOpen = ref(false)
const paymentAmount = ref(0)
const saving = ref(false)

onMounted(async () => {
  try {
    await fetchLoanById(loanId.value)
  } catch {
    // Error en VAlert.
  }
})

const employeeName = () => {
  const employee = currentLoan.value?.employee
  if (typeof employee === 'object' && employee) {
    return `${employee.firstName} ${employee.lastName} (${employee.document})`
  }
  return 'Empleado'
}

const doPayment = async () => {
  if (!paymentAmount.value || paymentAmount.value <= 0) return
  saving.value = true
  try {
    await addPayment(loanId.value, Number(paymentAmount.value))
    paymentOpen.value = false
    snackbar.success('Abono registrado')
  } catch {
    // Error en VAlert.
  }
  saving.value = false
}

const changeStatus = async (status: 'active' | 'paid' | 'cancelled') => {
  saving.value = true
  try {
    await updateLoan(loanId.value, { status })
    snackbar.success('Estado actualizado')
  } catch {
    // Error en VAlert.
  }
  saving.value = false
}
</script>

<template>
  <div>
    <CommonPageHeader :title="employeeName()" subtitle="Detalle del préstamo">
      <template #actions>
        <v-btn
          variant="text"
          color="grey-darken-1"
          prepend-icon="mdi-arrow-left"
          to="/admin/loans"
        >
          Volver
        </v-btn>
      </template>
    </CommonPageHeader>

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

    <v-row v-if="currentLoan" density="compact" class="mb-4">
      <v-col cols="12" sm="6" lg="3">
        <v-card class="h-100">
          <v-card-text>
            <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
              Capital
            </div>
            <div class="text-subtitle-1 font-weight-medium">
              {{ formatCOP(currentLoan.principal) }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" lg="3">
        <v-card class="h-100">
          <v-card-text>
            <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
              Cuota mensual
            </div>
            <div class="text-subtitle-1 font-weight-medium">
              {{ formatCOP(currentLoan.installment) }}
              <span class="text-caption text-medium-emphasis">
                × {{ currentLoan.termMonths }} meses
              </span>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" lg="3">
        <v-card class="h-100">
          <v-card-text>
            <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
              Saldo pendiente
            </div>
            <div class="text-subtitle-1 font-weight-bold text-primary">
              {{ formatCOP(currentLoan.balance) }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" lg="3">
        <v-card class="h-100">
          <v-card-text>
            <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
              Estado
            </div>
            <LoanStatusBadge :status="currentLoan.status" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-card v-if="currentLoan" class="mb-4">
      <v-card-item>
        <v-card-title class="text-subtitle-1 font-weight-bold">
          Historial de pagos
        </v-card-title>
        <template #append>
          <v-btn
            v-if="canManage && currentLoan.status === 'active'"
            size="small"
            color="primary"
            variant="tonal"
            prepend-icon="mdi-cash-plus"
            @click="paymentOpen = true"
          >
            Abonar manualmente
          </v-btn>
        </template>
      </v-card-item>
      <v-divider />
      <v-table v-if="currentLoan.payments.length" density="compact">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Período</th>
            <th>Tipo</th>
            <th class="text-end">Valor</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(payment, index) in currentLoan.payments" :key="index">
            <td class="text-body-2">
              {{ formatDate(payment.paidAt, 'DD/MM/YYYY') }}
            </td>
            <td class="text-body-2">
              {{
                payment.periodStart && payment.periodEnd
                  ? `${formatDate(payment.periodStart, 'DD/MM/YYYY')} – ${formatDate(payment.periodEnd, 'DD/MM/YYYY')}`
                  : '—'
              }}
            </td>
            <td class="text-body-2">
              <v-chip
                size="x-small"
                variant="tonal"
                :color="payment.type === 'installment' ? 'primary' : 'secondary'"
              >
                {{ payment.type === 'installment' ? 'Cuota nómina' : 'Abono manual' }}
              </v-chip>
            </td>
            <td class="text-body-2 text-end">
              {{ formatCOP(payment.amount) }}
            </td>
          </tr>
        </tbody>
      </v-table>
      <v-card-text v-else class="text-medium-emphasis">
        Sin pagos registrados todavía. El descuento se aplica automáticamente al
        aprobar la nómina del período.
      </v-card-text>
    </v-card>

    <v-card v-if="canManage && currentLoan" class="mb-4">
      <v-card-item>
        <v-card-title class="text-subtitle-1 font-weight-bold">
          Acciones
        </v-card-title>
      </v-card-item>
      <v-divider />
      <v-card-actions>
        <v-btn
          v-if="currentLoan.status === 'active'"
          variant="tonal"
          color="success"
          prepend-icon="mdi-check"
          :loading="saving"
          @click="changeStatus('paid')"
        >
          Marcar como pagado
        </v-btn>
        <v-btn
          v-if="currentLoan.status === 'active'"
          variant="tonal"
          color="error"
          prepend-icon="mdi-cancel"
          :loading="saving"
          @click="changeStatus('cancelled')"
        >
          Cancelar préstamo
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-dialog v-model="paymentOpen" max-width="420" persistent>
      <v-card>
        <v-card-title class="text-subtitle-1">Abono manual</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="paymentAmount"
            label="Valor del abono ($)"
            type="number"
            min="1"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" color="grey-darken-1" @click="paymentOpen = false">
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="saving"
            :disabled="saving || !paymentAmount || paymentAmount <= 0"
            @click="doPayment"
          >
            Registrar abono
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
