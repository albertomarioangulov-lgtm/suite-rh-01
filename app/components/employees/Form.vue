<script setup lang="ts">
import { betweenRule, requiredRule } from '~/utils/validation-rules'
import { CONTRACT_TYPE_LABELS } from '~/utils/contract-types'
import { API_PATHS } from '~/utils/api-paths'
import { FEATURE_FLAGS } from '~~/shared/feature-flags'
import { useFeatureFlagsState } from '~/composables/states/useFeatureFlagsState'
import type { IEmployeeView } from '~/composables/states/useEmployeeState'
import type { VForm } from 'vuetify/components'

const props = defineProps<{
  employee?: IEmployeeView | null
}>()

const emit = defineEmits<{
  (e: 'saved', data: Record<string, unknown>): void
  (e: 'cancel'): void
  (e: 'saving-change', value: boolean): void
}>()

const isNew = computed(() => !props.employee)
const { authFetch } = useAuthState()
const { enabledFlags, fetchFlags } = useFeatureFlagsState()

onMounted(async () => {
  if (enabledFlags.value.length === 0) await fetchFlags()
})
const needsPayroll = computed(() =>
  enabledFlags.value.includes(FEATURE_FLAGS.PAYROLL),
)
const baseSalaryRules = computed(() =>
  needsPayroll.value
    ? [requiredRule('Ingresa el salario base'), betweenRule(0, 100000000000)]
    : [betweenRule(0, 100000000000)],
)

const linkedUserId = computed(() => {
  const user = props.employee?.user
  if (typeof user === 'object' && user) {
    return (user as { _id?: string })._id ?? ''
  }
  return typeof user === 'string' ? user : ''
})

const userLabel = computed(() => {
  const user = props.employee?.user
  if (typeof user === 'object' && user) return user.name
  return typeof user === 'string' ? user : ''
})

const formState = reactive({
  accountMode: isNew.value ? 'link' : props.employee?.user ? 'link' : 'none',
  userId: linkedUserId.value,
  createEmail: '',
  createPassword: '',
  document: props.employee?.document ?? '',
  documentType: props.employee?.documentType ?? 13,
  firstName: props.employee?.firstName ?? '',
  lastName: props.employee?.lastName ?? '',
  email: props.employee?.email ?? '',
  hireDate: props.employee?.hireDate
    ? String(props.employee.hireDate).slice(0, 10)
    : '',
  contractType: props.employee?.contractType ?? 'indefinite',
  employeeType: props.employee?.employeeType ?? '01',
  subEmployeeType: props.employee?.subEmployeeType ?? '00',
  salarioIntegral: props.employee?.salarioIntegral ?? false,
  bankName: props.employee?.bankName ?? '',
  accountType: props.employee?.accountType ?? null,
  accountNumber: props.employee?.accountNumber ?? '',
  payrollCycle: props.employee?.payrollCycle
    ? typeof props.employee.payrollCycle === 'object'
      ? (props.employee.payrollCycle._id ?? '')
      : props.employee.payrollCycle
    : '',
  baseSalary: props.employee?.baseSalary ?? 0,
  position: props.employee?.position ?? '',
  department: props.employee?.department
    ? typeof props.employee.department === 'object'
      ? (props.employee.department._id ?? '')
      : props.employee.department
    : '',
  manager: props.employee?.manager
    ? typeof props.employee.manager === 'object'
      ? (props.employee.manager._id ?? '')
      : props.employee.manager
    : '',
  active: props.employee?.active ?? true,
})

const userOptions = ref<Array<{ title: string; value: string }>>([])
const loadingUsers = ref(false)
const departmentOptions = ref<Array<{ title: string; value: string }>>([])
const positionOptions = ref<Array<{ title: string; value: string; departmentId: string | null }>>([])
const loadingCatalog = ref(false)
const managerOptions = ref<Array<{ title: string; value: string }>>([])
const cycleOptions = ref<Array<{ title: string; value: string }>>([])

onMounted(async () => {
  loadingUsers.value = true
  try {
    const data = await authFetch<
      Array<{ _id: string; name: string; email: string }>
    >(API_PATHS.employees.availableUsers)
    userOptions.value = data.map((user) => ({
      title: `${user.name} (${user.email})`,
      value: user._id,
    }))
  } catch {
    // Error silencioso: el select queda vacío.
  } finally {
    loadingUsers.value = false
  }
})

onMounted(async () => {
  loadingCatalog.value = true
  try {
    const departments = await authFetch<{
      items: Array<{ id: string; name: string }>
    }>(API_PATHS.organization.departments)
    departmentOptions.value = departments.items.map((department) => ({
      title: department.name,
      value: department.id,
    }))
    const positions = await authFetch<{
      items: Array<{
        id: string
        title: string
        departmentId: string | null
      }>
    }>(API_PATHS.organization.positions)
    positionOptions.value = positions.items.map((position) => ({
      title: position.title,
      value: position.title,
      departmentId: position.departmentId,
    }))
  } catch {
    // Catálogo vacío: el campo de cargo sigue permitiendo texto libre.
  } finally {
    loadingCatalog.value = false
  }
})

onMounted(async () => {
  try {
    const data = await authFetch<{
      items: Array<{ _id: string; name: string }>
    }>(API_PATHS.payrollCycles.list)
    cycleOptions.value = data.items.map((cycle) => ({
      title: cycle.name,
      value: cycle._id,
    }))
  } catch {
    // Sin ciclos: la ficha usa el ciclo por defecto de la empresa.
  }
})

onMounted(async () => {
  try {
    const data = await authFetch<{
      items: Array<{ _id: string; firstName: string; lastName: string }>
    }>(API_PATHS.employees.list, {
      query: { limit: 100, active: 'true' },
    })
    managerOptions.value = data.items
      .filter((employee) => employee._id !== props.employee?._id)
      .map((employee) => ({
        title: `${employee.firstName} ${employee.lastName}`,
        value: employee._id,
      }))
  } catch {
    // Select de jefe directo queda vacío.
  }
})

const filteredPositionOptions = computed(() => {
  if (!formState.department) return positionOptions.value
  return positionOptions.value.filter(
    (position) =>
      !position.departmentId || position.departmentId === formState.department,
  )
})

const contractOptions = Object.entries(CONTRACT_TYPE_LABELS).map(
  ([value, title]) => ({ title, value }),
)

const documentTypeOptions = [
  { title: 'Cédula de ciudadanía', value: 13 },
  { title: 'Registro civil', value: 11 },
  { title: 'Tarjeta de identidad', value: 12 },
  { title: 'Tarjeta de extranjería', value: 21 },
  { title: 'Cédula de extranjería', value: 22 },
  { title: 'NIT', value: 31 },
  { title: 'Pasaporte', value: 41 },
  { title: 'Documento de identificación extranjero', value: 42 },
  { title: 'PEP', value: 47 },
  { title: 'NIT de otro país', value: 50 },
  { title: 'NUIP', value: 91 },
]

const employeeTypeOptions = [
  { title: 'Dependiente', value: '01' },
  { title: 'Servicio doméstico', value: '02' },
  { title: 'Madre comunitaria', value: '04' },
  { title: 'Aprendiz del SENA (etapa lectiva)', value: '12' },
  { title: 'Funcionario público sin tope máximo de IBC', value: '18' },
  { title: 'Aprendiz del SENA (etapa productiva)', value: '19' },
  { title: 'Estudiante de posgrado en salud', value: '21' },
  { title: 'Profesor de establecimiento particular', value: '22' },
  { title: 'Estudiante con aportes solo a riesgos laborales', value: '23' },
  { title: 'Dependiente entidad pública con régimen especial en salud', value: '30' },
  { title: 'Cooperado o precooperativa de trabajo asociado', value: '31' },
  { title: 'Dependiente entidad del SGP (aportes patronales)', value: '47' },
  { title: 'Trabajador de tiempo parcial', value: '51' },
  { title: 'Pre pensionado de entidad en liquidación', value: '54' },
  { title: 'Pre pensionado con aporte voluntario a salud', value: '56' },
  { title: 'Estudiante de prácticas laborales en el sector público', value: '58' },
]

const subEmployeeTypeOptions = [
  { title: 'No aplica', value: '00' },
  { title: 'Dependiente pensionado por vejez activo', value: '01' },
]

const accountTypeOptions = [
  { title: 'Ahorros', value: 'ahorros' },
  { title: 'Corriente', value: 'corriente' },
]

const rules = {
  userId: [requiredRule('Selecciona el usuario a vincular')],
  createEmail: [requiredRule('Ingresa el correo de la cuenta')],
  createPassword: [requiredRule('Ingresa la contraseña')],
  document: [requiredRule('Ingresa el documento')],
  firstName: [requiredRule('Ingresa el nombre')],
  lastName: [requiredRule('Ingresa el apellido')],
  position: [requiredRule('Ingresa el cargo')],
}

const formRef = ref<InstanceType<typeof VForm> | null>(null)
const saving = ref(false)

watch(saving, (value) => emit('saving-change', value))
const error = ref('')

const accountOptions = [
  { title: 'Sin cuenta', value: 'none' },
  { title: 'Vincular usuario existente', value: 'link' },
  ...(isNew.value
    ? [{ title: 'Crear cuenta nueva', value: 'create' }]
    : []),
]

const save = async () => {
  const { valid } = (await formRef.value?.validate()) ?? { valid: true }
  if (!valid) return

  saving.value = true
  error.value = ''
  try {
    const payload: Record<string, unknown> = {
      document: formState.document.trim(),
      documentType: Number(formState.documentType),
      firstName: formState.firstName.trim(),
      lastName: formState.lastName.trim(),
      email: formState.email.trim() || undefined,
      hireDate: formState.hireDate || undefined,
      contractType: formState.contractType,
      employeeType: formState.employeeType,
      subEmployeeType: formState.subEmployeeType,
      salarioIntegral: formState.salarioIntegral,
      bankName: formState.bankName.trim() || undefined,
      accountType: formState.accountType || undefined,
      accountNumber: formState.accountNumber.trim() || undefined,
      payrollCycle: formState.payrollCycle || null,
      baseSalary: Number(formState.baseSalary),
      position: formState.position.trim(),
      department: formState.department || null,
      manager: formState.manager || null,
      active: formState.active,
    }

    if (isNew.value) {
      payload.accountMode = formState.accountMode
      if (formState.accountMode === 'link') {
        payload.userId = formState.userId
      } else if (formState.accountMode === 'create') {
        payload.createEmail = formState.createEmail.trim()
        payload.createPassword = formState.createPassword
      }
    } else if (formState.accountMode === 'none') {
      payload.unlinkUser = true
    } else if (formState.userId) {
      // En edición solo se reenvía si se eligió un usuario nuevo;
      // si no, se conserva el vínculo actual.
      payload.userId = formState.userId
    }

    emit('saved', payload)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <v-form ref="formRef" @submit.prevent="save">
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

    <v-row>
      <v-col cols="12">
        <v-chip
          v-if="!isNew && employee?.user"
          color="primary"
          variant="tonal"
          class="mb-3"
          prepend-icon="mdi-account-check-outline"
        >
          Usuario vinculado: {{ userLabel }}
        </v-chip>

        <v-radio-group
          v-model="formState.accountMode"
          :inline="isNew"
          class="mb-1"
        >
          <v-radio
            v-for="option in accountOptions"
            :key="option.value"
            :label="option.title"
            :value="option.value"
          />
        </v-radio-group>

        <v-autocomplete
          v-if="formState.accountMode === 'link'"
          v-model="formState.userId"
          :items="userOptions"
          label="Cuentas sin ficha de empleado (rol empleado)"
          item-title="title"
          item-value="value"
          :rules="rules.userId"
          :loading="loadingUsers"
          class="mb-3"
        />

        <template v-if="formState.accountMode === 'create'">
          <v-text-field
            v-model="formState.createEmail"
            label="Correo de la cuenta"
            type="email"
            :rules="rules.createEmail"
            class="mb-3"
          />
          <v-text-field
            v-model="formState.createPassword"
            label="Contraseña"
            type="password"
            :rules="rules.createPassword"
            class="mb-3"
          />
        </template>
      </v-col>

      <v-col cols="12" sm="6">
        <v-text-field
          v-model="formState.document"
          label="Documento"
          :rules="rules.document"
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-select
          v-model="formState.documentType"
          :items="documentTypeOptions"
          label="Tipo de documento (DIAN)"
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field
          v-model="formState.firstName"
          label="Nombre"
          :rules="rules.firstName"
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field
          v-model="formState.lastName"
          label="Apellido"
          :rules="rules.lastName"
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field
          v-model="formState.email"
          label="Email"
          type="email"
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field
          v-model="formState.hireDate"
          label="Fecha de ingreso"
          type="date"
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-select
          v-model="formState.contractType"
          :items="contractOptions"
          label="Tipo de contrato"
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-select
          v-model="formState.employeeType"
          :items="employeeTypeOptions"
          label="Tipo de trabajador (DIAN)"
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-select
          v-model="formState.subEmployeeType"
          :items="subEmployeeTypeOptions"
          label="Subtipo de trabajador (DIAN)"
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-select
          v-model="formState.payrollCycle"
          :items="cycleOptions"
          label="Ciclo de pago (opcional)"
          hint="Vacío = ciclo por defecto de la empresa"
          persistent-hint
          clearable
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field
          v-model="formState.baseSalary"
          label="Salario base ($)"
          type="number"
          :rules="baseSalaryRules"
          :hint="needsPayroll ? undefined : 'Opcional: solo lo necesita el módulo de Nómina'"
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-select
          v-model="formState.department"
          :items="departmentOptions"
          label="Área"
          clearable
          :loading="loadingCatalog"
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-autocomplete
          v-model="formState.position"
          :items="filteredPositionOptions"
          item-title="title"
          item-value="value"
          label="Cargo"
          :rules="rules.position"
          :loading="loadingCatalog"
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-autocomplete
          v-model="formState.manager"
          :items="managerOptions"
          label="Jefe directo"
          clearable
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-switch
          v-model="formState.active"
          label="Empleado activo"
          color="success"
          inset
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-switch
          v-model="formState.salarioIntegral"
          label="Contrato de salario integral"
          color="primary"
          inset
          class="mb-3"
        />
      </v-col>
      <v-col cols="12">
        <v-divider class="mb-3" />
        <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-2">
          Datos bancarios (para el pago de nómina)
        </div>
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field
          v-model="formState.bankName"
          label="Banco"
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="3">
        <v-select
          v-model="formState.accountType"
          :items="accountTypeOptions"
          label="Tipo de cuenta"
          clearable
          class="mb-3"
        />
      </v-col>
      <v-col cols="12" sm="3">
        <v-text-field
          v-model="formState.accountNumber"
          label="Número de cuenta"
          class="mb-3"
        />
      </v-col>
    </v-row>

    <div class="d-flex justify-end ga-2">
      <v-btn variant="text" color="grey-darken-1" @click="emit('cancel')">
        Cancelar
      </v-btn>
      <v-btn
        color="primary"
        variant="tonal"
        type="submit"
        :loading="saving"
        :disabled="saving"
      >
        {{ isNew ? 'Crear empleado' : 'Guardar cambios' }}
      </v-btn>
    </div>
  </v-form>
</template>
