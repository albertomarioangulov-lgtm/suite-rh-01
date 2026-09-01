<script setup lang="ts">
import { API_PATHS } from '~/utils/api-paths'
import { formatCOP } from '~/utils/number-helpers'
import { formatDate } from '~~/shared/utils/datetime-helpers'
import {
  ABSENCE_STATUS_LABELS,
  ABSENCE_TYPE_LABELS,
  ABSENCE_TYPE_LIST,
  type AbsenceType,
} from '~~/shared/absence'
import type { IPayrollEntry } from '~/composables/states/usePayrollState'

definePageMeta({
  middleware: 'auth',
})

const { authFetch } = useAuthState()
const snackbar = useSnackbarState()
const { generating: pdfGenerating, downloadReceipt } = usePayrollReceiptPdf()

interface ISelfProfile {
  id: string
  firstName: string
  lastName: string
  document: string
  email: string
  position: string
  department: string
  contractType: string
  hireDate?: string | null
  baseSalary: number
  manager: string
  active: boolean
}

interface ISelfPayroll {
  _id: string
  periodStart?: string
  periodEnd?: string
  status: string
  totalEarned: number
  totalDeducted: number
  totalSocialSecurity: number
  totalToPay: number
  days: number
  devengados: IPayrollEntry['devengados'] | null
  deducciones: IPayrollEntry['deducciones'] | null
  seguridadSocial: IPayrollEntry['seguridadSocial'] | null
}

interface ISelfAbsence {
  _id: string
  type: string
  startDate?: string
  endDate?: string
  days: number
  status: string
  observations: string
  rejectionReason: string
  createdAt?: string
}

const profile = ref<ISelfProfile | null>(null)
const payrolls = ref<ISelfPayroll[]>([])
const absences = ref<ISelfAbsence[]>([])
const loading = ref(true)
const error = ref('')
const tab = ref('payroll')

const PAYROLL_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  approved: 'Aprobada',
  paid: 'Pagada',
  cancelled: 'Anulada',
}

const fullName = computed(() =>
  profile.value
    ? `${profile.value.firstName} ${profile.value.lastName}`.trim()
    : '',
)

const absenceTypeOptions = computed(() =>
  ABSENCE_TYPE_LIST.map((type) => ({
    label: ABSENCE_TYPE_LABELS[type],
    value: type,
  })),
)

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const [profileData, payrollData, absenceData] = await Promise.all([
      authFetch<ISelfProfile>(API_PATHS.self.me),
      authFetch<ISelfPayroll[]>(API_PATHS.self.payroll),
      authFetch<{ items: ISelfAbsence[] }>(API_PATHS.self.absences),
    ])
    profile.value = profileData
    payrolls.value = payrollData
    absences.value = absenceData.items
  } catch (err) {
    const apiError = err as { data?: { message?: string } } | null
    error.value =
      apiError?.data?.message ||
      'No se pudo cargar tu portal. Verifica que tu cuenta tenga una ficha de empleado vinculada.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

// ---- Recibo ----
const reciboOpen = ref(false)
const selectedPayroll = ref<ISelfPayroll | null>(null)

const openRecibo = (payroll: ISelfPayroll) => {
  selectedPayroll.value = payroll
  reciboOpen.value = true
}

const selectedEntry = computed<IPayrollEntry | null>(() => {
  const payroll = selectedPayroll.value
  if (!payroll) return null
  return {
    employee: profile.value?.id ?? '',
    devengados:
      payroll.devengados ?? {
        baseSalary: 0,
        daysWorked: 0,
        transportAllowance: 0,
        overtimeDay: 0,
        overtimeNight: 0,
        nightSurcharge: 0,
        bonuses: 0,
        commissions: 0,
        total: 0,
      },
    deducciones:
      payroll.deducciones ?? {
        employeeHealth: 0,
        employeePension: 0,
        sourceRetention: 0,
        garnishments: 0,
        loans: 0,
        total: 0,
      },
    seguridadSocial:
      payroll.seguridadSocial ?? {
        employerHealth: 0,
        employerPension: 0,
        arl: 0,
        sena: 0,
        icbf: 0,
        compensationFund: 0,
        total: 0,
      },
    totalToPay: payroll.totalToPay,
  }
})

const downloadRecibo = async () => {
  const payroll = selectedPayroll.value
  if (!payroll || !profile.value) return
  const zeros = () => ({ baseSalary: 0, daysWorked: 0, transportAllowance: 0, overtimeDay: 0, overtimeNight: 0, nightSurcharge: 0, bonuses: 0, commissions: 0, total: 0 })
  await downloadReceipt(
    {
      devengados: payroll.devengados ?? (zeros() as IPayrollEntry['devengados']),
      deducciones: payroll.deducciones ?? {
        employeeHealth: 0,
        employeePension: 0,
        sourceRetention: 0,
        garnishments: 0,
        loans: 0,
        total: 0,
      },
      seguridadSocial: payroll.seguridadSocial ?? {
        employerHealth: 0,
        employerPension: 0,
        arl: 0,
        sena: 0,
        icbf: 0,
        compensationFund: 0,
        total: 0,
      },
      totalToPay: payroll.totalToPay,
      periodLabel: `${formatDate(payroll.periodStart, 'DD/MM/YYYY')} – ${formatDate(payroll.periodEnd, 'DD/MM/YYYY')}`,
      days: payroll.days,
      status: payroll.status,
    },
    {
      firstName: profile.value.firstName,
      lastName: profile.value.lastName,
      document: profile.value.document,
      position: profile.value.position,
    },
  )
}

// ---- Solicitar permiso ----
const requestOpen = ref(false)
const saving = ref(false)
const requestForm = ref({
  type: '' as AbsenceType | '',
  startDate: '',
  endDate: '',
  observations: '',
})

const openRequest = () => {
  requestForm.value = { type: '', startDate: '', endDate: '', observations: '' }
  requestOpen.value = true
}

const submitRequest = async () => {
  if (!requestForm.value.type || !requestForm.value.startDate || !requestForm.value.endDate) {
    snackbar.error('Completa el tipo y las fechas del permiso.')
    return
  }
  saving.value = true
  try {
    await authFetch(API_PATHS.self.absences, {
      method: 'POST',
      body: {
        type: requestForm.value.type,
        startDate: requestForm.value.startDate,
        endDate: requestForm.value.endDate,
        observations: requestForm.value.observations || undefined,
      },
    })
    requestOpen.value = false
    snackbar.success('Permiso solicitado. Queda pendiente de aprobación.')
    await load()
  } catch {
    snackbar.error('No se pudo enviar la solicitud. Revisa los datos e inténtalo de nuevo.')
  } finally {
    saving.value = false
  }
}

const payrollHeaders = [
  { title: 'Período', key: 'period' },
  { title: 'Días', key: 'days', sortable: true },
  { title: 'Devengado', key: 'totalEarned', sortable: true, align: 'end' },
  { title: 'Deducciones', key: 'totalDeducted', sortable: true, align: 'end' },
  { title: 'Neto a pagar', key: 'totalToPay', sortable: true, align: 'end' },
  { title: 'Estado', key: 'status' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
]

const absenceHeaders = [
  { title: 'Tipo', key: 'type' },
  { title: 'Desde', key: 'startDate' },
  { title: 'Hasta', key: 'endDate' },
  { title: 'Días', key: 'days', sortable: true },
  { title: 'Estado', key: 'status' },
  { title: 'Observaciones', key: 'observations' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
]

const cancellingId = ref<string | null>(null)

const cancelAbsence = async (item: ISelfAbsence) => {
  const label = ABSENCE_TYPE_LABELS[item.type as AbsenceType] ?? item.type
  if (!confirm(`¿Cancelar la solicitud de ${label}?`)) return
  cancellingId.value = item._id
  try {
    await authFetch(API_PATHS.self.absenceCancel(item._id), { method: 'DELETE' })
    snackbar.success('Solicitud cancelada')
    await load()
  } catch {
    snackbar.error('No se pudo cancelar la solicitud.')
  } finally {
    cancellingId.value = null
  }
}
</script>

<template>
  <div>
    <CommonPageHeader
      title="Mi portal"
      subtitle="Autoservicio del empleado: recibos de nómina y solicitud de permisos"
    />

    <v-alert
      v-if="error"
      type="info"
      variant="tonal"
      density="compact"
      class="mb-4"
      :text="error"
    />

    <v-card v-if="loading && !profile" max-width="640" class="mx-auto">
      <v-skeleton-loader type="list-item-avatar-two-line, divider, list-item-three-line" />
    </v-card>

    <template v-if="profile && !error">
      <v-card class="mb-4">
        <v-card-item>
          <template #prepend>
            <v-avatar color="primary" variant="tonal" size="52">
              <v-icon color="primary" size="28">mdi-account-circle-outline</v-icon>
            </v-avatar>
          </template>
          <v-card-title class="text-h6 font-weight-bold">
            {{ fullName }}
          </v-card-title>
          <v-card-subtitle>
            {{ profile.position || 'Sin cargo' }}
            <template v-if="profile.department"> · {{ profile.department }}</template>
          </v-card-subtitle>
          <template #append>
            <v-chip v-if="profile.active" size="small" color="success" variant="tonal">
              Activo
            </v-chip>
            <v-chip v-else size="small" color="error" variant="tonal">
              Inactivo
            </v-chip>
          </template>
        </v-card-item>
        <v-divider />
        <v-list density="compact" class="pt-0">
          <v-list-item
            title="Documento"
            :subtitle="profile.document"
            prepend-icon="mdi-card-account-details-outline"
          />
          <v-list-item
            title="Correo"
            :subtitle="profile.email || '—'"
            prepend-icon="mdi-email-outline"
          />
          <v-list-item
            title="Salario base"
            :subtitle="formatCOP(profile.baseSalary)"
            prepend-icon="mdi-cash"
          />
          <v-list-item
            title="Contrato"
            :subtitle="profile.contractType || '—'"
            prepend-icon="mdi-file-document-outline"
          />
          <v-list-item
            title="Fecha de ingreso"
            :subtitle="profile.hireDate ? formatDate(profile.hireDate, 'DD/MM/YYYY') : '—'"
            prepend-icon="mdi-calendar-plus"
          />
          <v-list-item
            title="Jefe directo"
            :subtitle="profile.manager || '—'"
            prepend-icon="mdi-account-supervisor-outline"
          />
        </v-list>
      </v-card>

      <v-tabs v-model="tab" color="primary" class="mb-3">
        <v-tab value="payroll" prepend-icon="mdi-cash-multiple">Recibos de nómina</v-tab>
        <v-tab value="absences" prepend-icon="mdi-calendar-edit-outline">Mis permisos</v-tab>
      </v-tabs>

      <template v-if="tab === 'payroll'">
        <v-data-table
          :headers="payrollHeaders"
          :items="payrolls"
          density="compact"
          hover
          class="rounded-lg overflow-hidden"
        >
          <template #[`item.period`]="{ item }">
            {{ formatDate(item.periodStart, 'DD/MM/YYYY') }} –
            {{ formatDate(item.periodEnd, 'DD/MM/YYYY') }}
          </template>
          <template #[`item.totalEarned`]="{ item }">
            {{ formatCOP(item.totalEarned) }}
          </template>
          <template #[`item.totalDeducted`]="{ item }">
            {{ formatCOP(item.totalDeducted) }}
          </template>
          <template #[`item.totalToPay`]="{ item }">
            <span class="font-weight-medium">{{ formatCOP(item.totalToPay) }}</span>
          </template>
          <template #[`item.status`]="{ item }">
            <PayrollStatusBadge :status="item.status" />
          </template>
          <template #[`item.actions`]="{ item }">
            <v-btn
              icon="mdi-file-eye-outline"
              size="small"
              variant="text"
              color="primary"
              title="Ver recibo"
              @click="openRecibo(item)"
            />
          </template>
          <template #no-data>
            Aún no tienes recibos de nómina.
          </template>
        </v-data-table>
      </template>

      <template v-else>
        <div class="d-flex align-center mb-3">
          <span class="text-subtitle-1 font-weight-bold">
            Solicitudes ({{ absences.length }})
          </span>
          <v-spacer />
          <v-btn
            color="primary"
            variant="tonal"
            prepend-icon="mdi-plus"
            @click="openRequest"
          >
            Solicitar permiso
          </v-btn>
        </div>

        <v-data-table
          :headers="absenceHeaders"
          :items="absences"
          density="compact"
          hover
          class="rounded-lg overflow-hidden"
        >
          <template #[`item.type`]="{ item }">
            {{ ABSENCE_TYPE_LABELS[item.type as AbsenceType] ?? item.type }}
          </template>
          <template #[`item.startDate`]="{ item }">
            {{ formatDate(item.startDate, 'DD/MM/YYYY') }}
          </template>
          <template #[`item.endDate`]="{ item }">
            {{ formatDate(item.endDate, 'DD/MM/YYYY') }}
          </template>
          <template #[`item.status`]="{ item }">
            <v-chip
              size="x-small"
              :color="
                item.status === 'approved'
                  ? 'success'
                  : item.status === 'rejected'
                    ? 'error'
                    : 'warning'
              "
              variant="tonal"
            >
              {{ ABSENCE_STATUS_LABELS[item.status as keyof typeof ABSENCE_STATUS_LABELS] ?? item.status }}
            </v-chip>
          </template>
          <template #[`item.observations`]="{ item }">
            <span class="text-caption text-medium-emphasis">
              {{ item.observations || '—' }}
            </span>
          </template>
          <template #[`item.actions`]="{ item }">
            <v-btn
              v-if="item.status === 'pending'"
              icon="mdi-close-circle-outline"
              size="small"
              variant="text"
              color="error"
              title="Cancelar solicitud"
              :loading="cancellingId === item._id"
              :disabled="cancellingId !== null"
              @click="cancelAbsence(item)"
            />
          </template>
          <template #no-data>
            Aún no has solicitado permisos.
          </template>
        </v-data-table>
      </template>
    </template>

    <v-dialog v-model="reciboOpen" max-width="560">
      <v-card v-if="selectedPayroll">
        <v-card-item>
          <template #prepend>
            <v-avatar color="primary" variant="tonal" size="44">
              <v-icon color="primary">mdi-cash-multiple</v-icon>
            </v-avatar>
          </template>
          <v-card-title class="text-subtitle-1 font-weight-bold">
            Recibo de nómina ·
            {{ formatDate(selectedPayroll.periodStart, 'DD/MM/YYYY') }} –
            {{ formatDate(selectedPayroll.periodEnd, 'DD/MM/YYYY') }}
          </v-card-title>
          <v-card-subtitle>
            {{ selectedPayroll.days }} día(s) · Neto
            {{ formatCOP(selectedPayroll.totalToPay) }}
          </v-card-subtitle>
          <template #append>
            <v-btn
              icon="mdi-close"
              variant="text"
              size="small"
              @click="reciboOpen = false"
            />
          </template>
        </v-card-item>
        <v-divider />
        <PayrollEmployeeBreakdown v-if="selectedEntry" :entry="selectedEntry" />
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="primary"
            variant="tonal"
            prepend-icon="mdi-download"
            :loading="pdfGenerating"
            @click="downloadRecibo"
          >
            Descargar PDF
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="requestOpen" max-width="520">
      <v-card>
        <v-card-title class="text-subtitle-1 font-weight-bold">
          Solicitar permiso o ausencia
        </v-card-title>
        <v-card-text>
          <v-select
            v-model="requestForm.type"
            :items="absenceTypeOptions"
            item-title="label"
            item-value="value"
            label="Tipo"
            variant="outlined"
            density="compact"
            class="mb-3"
          />
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="requestForm.startDate"
                label="Desde"
                type="date"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="requestForm.endDate"
                label="Hasta"
                type="date"
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>
          <v-textarea
            v-model="requestForm.observations"
            label="Observaciones"
            variant="outlined"
            density="compact"
            rows="2"
            auto-grow
          />
          <p class="text-caption text-medium-emphasis mt-2 mb-0">
            La solicitud queda pendiente y se notifica a RRHH/gerencia para su aprobación.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="requestOpen = false">Cancelar</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="saving"
            :disabled="saving"
            @click="submitRequest"
          >
            Enviar solicitud
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
