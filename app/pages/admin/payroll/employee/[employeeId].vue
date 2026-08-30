<script setup lang="ts">
import { ROLES, type UserRole } from '~~/shared/auth'
import { formatDate } from '~~/shared/utils/datetime-helpers'
import { formatCOP } from '~/utils/number-helpers'

definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const employeeId = computed(() => String(route.params.employeeId))

const { user } = useAuthState()
const { employeeHistory, loading, error, fetchEmployeeHistory } =
  usePayrollState()

const canView = computed(
  () =>
    !!user.value?.role &&
    ([ROLES.ADMIN, ROLES.MANAGER, ROLES.HR] as UserRole[]).includes(
      user.value.role,
    ),
)

watch(
  employeeId,
  () => {
    if (canView.value) fetchEmployeeHistory(employeeId.value)
  },
  { immediate: true },
)
</script>

<template>
  <div>
    <CommonPageHeader
      title="Historial de nómina"
      subtitle="Períodos y pagos del empleado"
    />

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

    <v-card v-if="canView" :loading="loading">
      <v-table>
        <thead>
          <tr>
            <th>Período</th>
            <th>Estado</th>
            <th>Devengado</th>
            <th>Deducido</th>
            <th>Neto</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="payroll in employeeHistory" :key="payroll._id">
            <td>
              {{ formatDate(payroll.periodStart, 'DD/MM/YYYY') }} –
              {{ formatDate(payroll.periodEnd, 'DD/MM/YYYY') }}
            </td>
            <td>
              <PayrollStatusBadge :status="payroll.status" />
            </td>
            <td>{{ formatCOP(payroll.totalEarned) }}</td>
            <td>{{ formatCOP(payroll.totalDeducted) }}</td>
            <td class="font-weight-medium">{{ formatCOP(payroll.totalToPay) }}</td>
          </tr>
          <tr v-if="!employeeHistory.length">
            <td colspan="5" class="text-center text-medium-emphasis">
              Sin nóminas para este empleado.
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <v-alert
      v-else
      type="warning"
      variant="tonal"
      text="No tienes permisos para ver este historial."
    />
  </div>
</template>
