<script setup lang="ts">
import { ROLES, type AuthUser } from '~~/shared/auth'
import { emailRule, minLengthRule, requiredRule } from '~/utils/validation-rules'
import type { VForm } from 'vuetify/components'

const props = defineProps<{
  user?: AuthUser | null
}>()

const emit = defineEmits<{
  (e: 'saved', user: AuthUser): void
  (e: 'cancel'): void
  (e: 'saving-change', value: boolean): void
}>()

const isNew = computed(() => !props.user)

const { user: authUser } = useAuthState()
const { createUser, updateUser } = useUserState()

const isAdmin = computed(() => authUser.value?.role === ROLES.ADMIN)
const canManageRole = computed(() => isAdmin.value)

const roleOptions = [
  { title: 'Administrador', value: ROLES.ADMIN },
  { title: 'Gerente', value: ROLES.MANAGER },
  { title: 'Recursos Humanos', value: ROLES.HR },
  { title: 'Empleado', value: ROLES.EMPLOYEE },
]

const formState = reactive({
  name: props.user?.name ?? '',
  email: props.user?.email ?? '',
  password: '',
  role: props.user?.role ?? ROLES.EMPLOYEE,
  active: props.user?.active ?? true,
})

const formRef = ref<InstanceType<typeof VForm> | null>(null)
const saving = ref(false)

watch(saving, (value) => emit('saving-change', value))
const showPassword = ref(false)
const error = ref('')
const invite = ref(false)
const employeeLink = ref(false)

const employeeState = reactive({
  firstName: '',
  lastName: '',
  document: '',
  position: '',
  baseSalary: 0,
  contractType: 'indefinite',
  hireDate: '',
})

const rules = computed(() => ({
  name: [requiredRule('Ingresa el nombre')],
  email: [requiredRule('Ingresa el email'), emailRule()],
  password:
    isNew.value
      ? invite.value
        ? []
        : [requiredRule('Ingresa una contraseña'), minLengthRule(6)]
      : [minLengthRule(6, 'Mínimo 6 caracteres si cambias la contraseña')],
  employeeFirstName: [requiredRule('Ingresa el nombre')],
  employeeLastName: [requiredRule('Ingresa el apellido')],
  employeeDocument: [requiredRule('Ingresa el documento')],
  employeePosition: [requiredRule('Ingresa el cargo')],
  employeeBaseSalary: [requiredRule('Ingresa el salario base')],
}))

const showEmployeeLink = computed(
  () =>
    isNew.value &&
    canManageRole.value &&
    formState.role === ROLES.EMPLOYEE,
)

const save = async () => {
  const { valid } = (await formRef.value?.validate()) ?? { valid: true }
  if (!valid) return

  saving.value = true
  error.value = ''
  try {
    const savedUser = isNew.value
      ? await createUser({
          name: formState.name.trim(),
          email: formState.email.trim(),
          role: formState.role,
          active: formState.active,
          ...(invite.value ? { invite: true } : { password: formState.password }),
          ...(employeeLink.value && formState.role === ROLES.EMPLOYEE
            ? {
                employee: {
                  firstName: employeeState.firstName.trim(),
                  lastName: employeeState.lastName.trim(),
                  document: employeeState.document.trim(),
                  position: employeeState.position.trim(),
                  baseSalary: Number(employeeState.baseSalary),
                  contractType: employeeState.contractType,
                  hireDate: employeeState.hireDate || undefined,
                },
              }
            : {}),
        })
      : await updateUser(props.user!._id, {
          name: formState.name.trim(),
          email: formState.email.trim(),
          ...(formState.password ? { password: formState.password } : {}),
          ...(canManageRole.value ? { role: formState.role, active: formState.active } : {}),
        })

    emit('saved', savedUser)
  } catch (err) {
    const apiError = err as { data?: { message?: string }; message?: string } | null
    error.value = apiError?.data?.message || apiError?.message || 'Error al guardar el usuario'
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

    <v-text-field v-model="formState.name" label="Nombre" :rules="rules.name" class="mb-3" />
    <v-text-field
      v-model="formState.email"
      label="Email"
      type="email"
      :rules="rules.email"
      class="mb-3"
    />
    <v-switch
      v-if="isNew"
      v-model="invite"
      label="Enviar invitación por email"
      hint="El usuario recibirá un enlace para crear su propia contraseña (válido 72 horas)."
      persistent-hint
      color="primary"
      class="mb-3"
    />
    <v-text-field
      v-if="!isNew || !invite"
      v-model="formState.password"
      label="Contraseña"
      :type="showPassword ? 'text' : 'password'"
      :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
      :rules="rules.password"
      :hint="isNew ? '' : 'Dejar vacío para no cambiar'"
      persistent-hint
      class="mb-3"
      @click:append-inner="showPassword = !showPassword"
    />

    <template v-if="canManageRole">
      <v-select
        v-model="formState.role"
        :items="roleOptions"
        label="Rol"
        item-title="title"
        item-value="value"
        class="mb-3"
      />
      <v-switch
        v-model="formState.active"
        label="Usuario activo"
        color="success"
        inset
        class="mb-2"
      />

      <template v-if="showEmployeeLink">
        <v-switch
          v-model="employeeLink"
          label="Crear ficha de empleado"
          hint="Genera el registro del empleado vinculado a esta cuenta."
          persistent-hint
          color="primary"
          class="mb-3"
        />

        <v-row v-if="employeeLink">
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="employeeState.firstName"
              label="Nombre del empleado"
              :rules="rules.employeeFirstName"
              class="mb-3"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="employeeState.lastName"
              label="Apellido del empleado"
              :rules="rules.employeeLastName"
              class="mb-3"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="employeeState.document"
              label="Documento"
              :rules="rules.employeeDocument"
              class="mb-3"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="employeeState.position"
              label="Cargo"
              :rules="rules.employeePosition"
              class="mb-3"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="employeeState.baseSalary"
              label="Salario base ($)"
              type="number"
              :rules="rules.employeeBaseSalary"
              class="mb-3"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="employeeState.hireDate"
              label="Fecha de ingreso"
              type="date"
              class="mb-3"
            />
          </v-col>
        </v-row>
      </template>
    </template>
    <v-alert
      v-else-if="!isNew"
      type="info"
      variant="tonal"
      density="compact"
      class="mb-3"
      text="Solo los administradores pueden cambiar el rol o el estado."
    />

    <div class="d-flex justify-end ga-2 pt-2">
      <v-btn variant="text" color="grey-darken-1" :disabled="saving" @click="emit('cancel')">
        Cancelar
      </v-btn>
      <v-btn color="primary" variant="tonal" type="submit" :loading="saving" :disabled="saving">
        {{ isNew ? 'Crear usuario' : 'Guardar cambios' }}
      </v-btn>
    </div>
  </v-form>
</template>
