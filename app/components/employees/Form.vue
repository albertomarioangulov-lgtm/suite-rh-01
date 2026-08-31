<script setup lang="ts">
import { betweenRule, requiredRule } from '~/utils/validation-rules'
import { CONTRACT_TYPE_LABELS } from '~/utils/contract-types'
import { API_PATHS } from '~/utils/api-paths'
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
  firstName: props.employee?.firstName ?? '',
  lastName: props.employee?.lastName ?? '',
  email: props.employee?.email ?? '',
  hireDate: props.employee?.hireDate
    ? String(props.employee.hireDate).slice(0, 10)
    : '',
  contractType: props.employee?.contractType ?? 'indefinite',
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

const rules = {
  userId: [requiredRule('Selecciona el usuario a vincular')],
  createEmail: [requiredRule('Ingresa el correo de la cuenta')],
  createPassword: [requiredRule('Ingresa la contraseña')],
  document: [requiredRule('Ingresa el documento')],
  firstName: [requiredRule('Ingresa el nombre')],
  lastName: [requiredRule('Ingresa el apellido')],
  baseSalary: [
    requiredRule('Ingresa el salario base'),
    betweenRule(0, 100000000000),
  ],
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
      firstName: formState.firstName.trim(),
      lastName: formState.lastName.trim(),
      email: formState.email.trim() || undefined,
      hireDate: formState.hireDate || undefined,
      contractType: formState.contractType,
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
        <v-text-field
          v-model="formState.baseSalary"
          label="Salario base ($)"
          type="number"
          :rules="rules.baseSalary"
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
