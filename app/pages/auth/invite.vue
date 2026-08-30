<script setup lang="ts">
import { minLengthRule, matchRule, requiredRule } from '~/utils/validation-rules'
import { API_PATHS } from '~/utils/api-paths'
import type { VForm } from 'vuetify/components'

definePageMeta({
  layout: 'login',
  middleware: 'not-authenticated',
})

const route = useRoute()
const token = computed(() => String(route.query.token || ''))
const { fetch: fetchSession } = useUserSession()

const formState = reactive({
  password: '',
  confirm: '',
})
const formRef = ref<InstanceType<typeof VForm> | null>(null)
const saving = ref(false)
const showPassword = ref(false)
const showConfirm = ref(false)
const error = ref('')

const noToken = computed(() => !token.value)

const rules = computed(() => ({
  password: [requiredRule('Ingresa una contraseña'), minLengthRule(6)],
  confirm: [requiredRule('Confirma la contraseña'), matchRule(() => formState.password)],
}))

const submit = async () => {
  const { valid } = (await formRef.value?.validate()) ?? { valid: true }
  if (!valid) return

  saving.value = true
  error.value = ''
  try {
    await $fetch(API_PATHS.auth.invite, {
      method: 'POST',
      body: { token: token.value, password: formState.password },
    })
    await fetchSession()
    await navigateTo('/home')
  } catch (err) {
    const apiError = err as { data?: { message?: string }; message?: string } | null
    error.value =
      apiError?.data?.message ||
      apiError?.message ||
      'La invitación no es válida. Solicita una nueva a un administrador.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AuthCard :loading="saving">
    <v-form v-if="!noToken" class="pa-4 position-relative" @submit.prevent="submit">
      <h1 class="text-h6 font-weight-bold mb-1">Crea tu contraseña</h1>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Define la contraseña para activar tu cuenta en el sistema de nómina.
      </p>

      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        density="compact"
        class="mb-4"
        :text="error"
        closable
        @click:close="error = ''"
      />

      <v-text-field
        v-model="formState.password"
        label="Nueva contraseña"
        :type="showPassword ? 'text' : 'password'"
        :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
        :rules="rules.password"
        :disabled="saving"
        class="mb-3"
        @click:append-inner="showPassword = !showPassword"
      />
      <v-text-field
        v-model="formState.confirm"
        label="Confirmar contraseña"
        :type="showConfirm ? 'text' : 'password'"
        :append-inner-icon="showConfirm ? 'mdi-eye-off' : 'mdi-eye'"
        :rules="rules.confirm"
        :disabled="saving"
        class="mb-4"
        @click:append-inner="showConfirm = !showConfirm"
      />

      <v-btn
        block
        type="submit"
        color="orange-darken-1"
        variant="flat"
        size="large"
        :loading="saving"
        :disabled="saving"
      >
        Activar cuenta
      </v-btn>
    </v-form>

    <div v-else class="pa-4">
      <v-alert
        type="error"
        variant="tonal"
        title="Invitación inválida"
        text="El enlace no contiene un token de invitación. Solicita uno nuevo a un administrador."
      />
      <v-btn block class="mt-4" variant="tonal" color="primary" to="/auth/login">
        Ir al inicio de sesión
      </v-btn>
    </div>
  </AuthCard>
</template>
