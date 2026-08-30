<script setup lang="ts">
import { ROLES } from '~~/shared/auth'
import { ABSENCE_TYPE_LABELS } from '~~/shared/absence'
import { formatDate } from '~~/shared/utils/datetime-helpers'
import type { IAbsenceView } from '~/composables/states/useAbsenceState'

definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const { user } = useAuthState()
const snackbar = useSnackbarState()
const { currentRecord, loading, error, fetchRecordById, approveRecord, rejectRecord } =
  useAbsenceState()

const id = computed(() => String(route.params.id))
const canManage = computed(() =>
  [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR].includes(user.value?.role as never),
)
const canDelete = computed(() => user.value?.role === ROLES.ADMIN)

const rejectOpen = ref(false)
const rejectReason = ref('')
const saving = ref(false)

onMounted(async () => {
  try {
    await fetchRecordById(id.value)
  } catch {
    // Error visible en el VAlert.
  }
})

const employeeName = (record: IAbsenceView | null) => {
  const employee = record?.employee
  if (typeof employee === 'object' && employee) {
    return `${employee.firstName} ${employee.lastName} (${employee.document})`
  }
  return employee ?? ''
}

const approve = async () => {
  saving.value = true
  try {
    await approveRecord(id.value)
    snackbar.success('Ausencia aprobada')
  } catch {
    // Error visible en el VAlert.
  }
  saving.value = false
}

const doReject = async () => {
  if (!rejectReason.value.trim()) return
  saving.value = true
  try {
    await rejectRecord(id.value, rejectReason.value.trim())
    rejectOpen.value = false
    snackbar.success('Ausencia rechazada')
  } catch {
    // Error visible en el VAlert.
  }
  saving.value = false
}

const money = (value?: number) =>
  value ? `$${Number(value).toLocaleString('es-CO')}` : '$0'
</script>

<template>
  <div>
    <CommonPageHeader
      title="Detalle de ausencia"
      :subtitle="employeeName(currentRecord)"
    >
      <template #actions>
        <v-btn
          variant="text"
          color="grey-darken-1"
          prepend-icon="mdi-arrow-left"
          to="/admin/ausencias"
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

    <v-card :loading="loading">
      <template v-if="currentRecord">
        <v-card-item>
          <template #prepend>
            <v-avatar color="primary" variant="tonal" size="48">
              <v-icon>mdi-calendar-edit-outline</v-icon>
            </v-avatar>
          </template>
          <v-card-title class="text-h6 font-weight-bold">
            {{ ABSENCE_TYPE_LABELS[currentRecord.type] }}
          </v-card-title>
          <v-card-subtitle>
            {{ formatDate(currentRecord.startDate, 'DD/MM/YYYY') }} →
            {{ formatDate(currentRecord.endDate, 'DD/MM/YYYY') }} ·
            {{ currentRecord.days }} día(s)
          </v-card-subtitle>
          <template #append>
            <AbsenceStatusBadge :status="currentRecord.status" />
          </template>
        </v-card-item>
        <v-divider />
        <v-list>
          <v-list-item
            title="Estado"
            :subtitle="currentRecord.status"
            prepend-icon="mdi-state-machine"
          />
          <v-list-item
            v-if="currentRecord.scheduledRestDate"
            title="Descanso compensatorio programado"
            :subtitle="formatDate(currentRecord.scheduledRestDate, 'DD/MM/YYYY')"
            prepend-icon="mdi-calendar-check-outline"
          />
          <v-list-item
            v-if="currentRecord.paidByCompanyDays > 0"
            title="Días pagados por la empresa"
            :subtitle="String(currentRecord.paidByCompanyDays)"
            prepend-icon="mdi-cash"
          />
          <v-list-item
            v-if="currentRecord.companyPaidValue > 0"
            title="Valor a cargo de la empresa"
            :subtitle="money(currentRecord.companyPaidValue)"
            prepend-icon="mdi-cash-multiple"
          />
          <v-list-item
            v-if="currentRecord.epsValue > 0"
            title="Valor cubierto por EPS"
            :subtitle="money(currentRecord.epsValue)"
            prepend-icon="mdi-hospital-box-outline"
          />
          <v-list-item
            v-if="currentRecord.arlValue > 0"
            title="Valor cubierto por ARL"
            :subtitle="money(currentRecord.arlValue)"
            prepend-icon="mdi-shield-check-outline"
          />
          <v-list-item
            v-if="currentRecord.supportDocument"
            title="Soporte"
            :subtitle="currentRecord.supportDocument"
            prepend-icon="mdi-file-document-outline"
          />
          <v-list-item
            v-if="currentRecord.observations"
            title="Observaciones"
            :subtitle="currentRecord.observations"
            prepend-icon="mdi-text-box-outline"
          />
          <v-list-item
            v-if="currentRecord.rejectionReason"
            title="Motivo de rechazo"
            :subtitle="currentRecord.rejectionReason"
            prepend-icon="mdi-close-circle-outline"
          />
        </v-list>

        <v-card-actions v-if="canManage && currentRecord.status === 'pending'">
          <v-spacer />
          <v-btn
            color="success"
            variant="tonal"
            prepend-icon="mdi-check"
            :loading="saving"
            @click="approve"
          >
            Aprobar
          </v-btn>
          <v-btn
            color="error"
            variant="tonal"
            prepend-icon="mdi-close"
            @click="rejectOpen = true"
          >
            Rechazar
          </v-btn>
        </v-card-actions>
      </template>
    </v-card>

    <v-dialog v-model="rejectOpen" max-width="480" persistent>
      <v-card>
        <v-card-title class="text-subtitle-1">Rechazar ausencia</v-card-title>
        <v-card-text>
          <v-textarea
            v-model="rejectReason"
            label="Motivo del rechazo"
            rows="3"
            auto-grow
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            color="grey-darken-1"
            @click="rejectOpen = false"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            :loading="saving"
            :disabled="saving || !rejectReason.trim()"
            @click="doReject"
          >
            Rechazar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
