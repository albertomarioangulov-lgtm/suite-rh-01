<script setup lang="ts">
import { z } from 'zod'

definePageMeta({
  layout: 'login',
  middleware: 'not-authenticated',
})

const { login } = useAuthState()
const route = useRoute()

const isLoading = ref(false)
const showPassword = ref(false)
const errorMessage = ref('')

const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Ingresa un email válido' }),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
})

const state = reactive({
  email: '',
  password: '',
})

const errors = reactive({
  email: '',
  password: '',
})

const validateField = (field: 'email' | 'password') => {
  const result = loginSchema.shape[field].safeParse(state[field])
  errors[field] = result.success ? '' : result.error.issues[0]?.message || ''
}

const validateForm = () => {
  errors.email = ''
  errors.password = ''
  errorMessage.value = ''

  const result = loginSchema.safeParse(state)
  if (result.success) return true

  result.error.issues.forEach((err) => {
    const field = err.path[0] as 'email' | 'password'
    errors[field] = err.message
  })

  return false
}

const dialogError = computed({
  get: () => !!errorMessage.value,
  set: (val: boolean) => {
    if (!val) errorMessage.value = ''
  },
})

const googleError = computed(() => route.query.google === 'no-account')

// Solo permite redirecciones internas: empieza con "/", no "//" (protocolo)
// ni "\" (escape de ruta), para evitar open redirects.
const safeRedirect = (path: unknown): path is string =>
  typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') && !path.includes('\\')

const onSubmit = async () => {
  if (!validateForm()) return

  isLoading.value = true
  errorMessage.value = ''

  const success = await login(state.email, state.password)
  if (!success) {
    errorMessage.value = 'Email o contraseña incorrectos'
    isLoading.value = false
    return
  }

  const target = safeRedirect(route.query.redirect) ? route.query.redirect : '/home'
  await navigateTo(target)
}
</script>

<template>
  <AuthCard :loading="isLoading">
    <v-form class="pa-4 position-relative" @submit.prevent="onSubmit">
      <v-alert
        v-if="googleError"
        type="info"
        variant="tonal"
        density="compact"
        class="mb-4"
        text="No existe una cuenta con ese correo. Contacta a un administrador para darte de alta."
      />

      <v-container fluid>
        <v-row>
          <v-col cols="12">
            <v-text-field
              v-model="state.email"
              label="Email"
              type="email"
              density="compact"
              append-inner-icon="mdi-email-outline"
              :error-messages="errors.email"
              :disabled="isLoading"
              clearable
              @input="errors.email = ''"
              @blur="validateField('email')"
            />
          </v-col>

          <v-col cols="12">
            <v-text-field
              v-model="state.password"
              label="Contraseña"
              :type="showPassword ? 'text' : 'password'"
              density="compact"
              :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
              :error-messages="errors.password"
              :disabled="isLoading"
              clearable
              @input="errors.password = ''"
              @blur="validateField('password')"
              @click:append-inner="showPassword = !showPassword"
            />
          </v-col>
        </v-row>

        <v-row class="mt-4 mb-1">
          <v-btn
            block
            type="submit"
            color="orange-darken-1"
            variant="flat"
            size="large"
            :loading="isLoading"
            :disabled="isLoading"
          >
            Iniciar sesión
          </v-btn>
        </v-row>

        <div class="text-center mt-3 mb-1">
          <span class="text-medium-emphasis text-body-2">
            ¿No tienes cuenta? Contacta a un administrador para crearla.
          </span>
        </div>
      </v-container>
    </v-form>

    <div class="px-4 pb-4">
      <v-divider class="mb-4">
        <span class="text-caption text-medium-emphasis px-2">o</span>
      </v-divider>

      <v-btn
        block
        variant="outlined"
        color="grey-darken-1"
        prepend-icon="mdi-google"
        :disabled="isLoading"
        @click="navigateTo('/auth/google')"
      >
        Continuar con Google
      </v-btn>
    </div>

    <v-dialog v-model="dialogError" width="auto" persistent>
      <v-card max-width="400">
        <v-card-text class="pa-0">
          <v-alert
            density="compact"
            variant="tonal"
            border="top"
            type="error"
            title="Error de acceso"
            :text="errorMessage"
            closable
            @click:close="errorMessage = ''"
          >
            <template #prepend>
              <v-icon>mdi-alert-circle-outline</v-icon>
            </template>
          </v-alert>
        </v-card-text>

        <v-card-actions class="justify-center pb-3">
          <v-btn variant="text" color="grey-darken-1" @click="errorMessage = ''"> Cerrar </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </AuthCard>
</template>
