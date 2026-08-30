<script setup lang="ts">
import { ROLE_LABELS } from '~~/shared/auth'
import { formatDate } from '~~/shared/utils/datetime-helpers'
import { minLengthRule, matchRule, requiredRule } from '~/utils/validation-rules'
import { API_PATHS } from '~/utils/api-paths'
import type { VForm } from 'vuetify/components'

definePageMeta({
  layout: 'default',
  middleware: 'auth',
})

const { user, authFetch } = useAuthState()

const initials = computed(() =>
  user.value
    ? user.value.name
        .split(' ')
        .map((part) => part.charAt(0))
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?',
)

const roleLabel = computed(() =>
  user.value ? ROLE_LABELS[user.value.role as keyof typeof ROLE_LABELS] || user.value.role : '',
)

const formState = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const formRef = ref<InstanceType<typeof VForm> | null>(null)
const saving = ref(false)
const error = ref('')
const success = ref('')
const showCurrent = ref(false)
const showNew = ref(false)
const showConfirm = ref(false)

const rules = computed(() => ({
  current: [requiredRule('Ingresa tu contraseña actual')],
  newPassword: [requiredRule('Ingresa la nueva contraseña'), minLengthRule(6)],
  confirm: [requiredRule('Confirma la nueva contraseña'), matchRule(() => formState.newPassword)],
}))

const save = async () => {
  const { valid } = (await formRef.value?.validate()) ?? { valid: true }
  if (!valid) return

  saving.value = true
  error.value = ''
  success.value = ''
  try {
    await authFetch(API_PATHS.auth.password, {
      method: 'PUT',
      body: {
        currentPassword: formState.currentPassword,
        newPassword: formState.newPassword,
      },
    })
    success.value = 'Contraseña actualizada correctamente.'
    formState.currentPassword = ''
    formState.newPassword = ''
    formState.confirmPassword = ''
    formRef.value?.resetValidation()
  } catch (err) {
    const apiError = err as { data?: { message?: string }; message?: string } | null
    error.value =
      apiError?.data?.message || apiError?.message || 'No se pudo actualizar la contraseña.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <CommonPageHeader
      title="Mi perfil"
      subtitle="Tus datos y la seguridad de tu cuenta"
      help-topic="perfil"
    />

    <v-row>
      <v-col cols="12" md="6">
        <v-card v-if="user" class="h-100">
          <v-card-item>
            <template #prepend>
              <v-avatar color="primary" variant="tonal" size="56">
                <span class="text-h6 font-weight-bold">{{ initials }}</span>
              </v-avatar>
            </template>
            <v-card-title class="text-h6 font-weight-bold">
              {{ user.name }}
            </v-card-title>
            <v-card-subtitle>{{ user.email }}</v-card-subtitle>
            <template #append>
              <div class="d-flex flex-column ga-1">
                <v-chip size="small" color="primary" variant="tonal">
                  {{ roleLabel }}
                </v-chip>
                <v-chip size="small" variant="tonal" :color="user.active ? 'success' : 'error'">
                  {{ user.active ? 'Activo' : 'Inactivo' }}
                </v-chip>
              </div>
            </template>
          </v-card-item>

          <v-divider />

          <v-list>
            <v-list-item title="Email" :subtitle="user.email" prepend-icon="mdi-email-outline" />
            <v-list-item
              title="Rol"
              :subtitle="roleLabel"
              prepend-icon="mdi-shield-account-outline"
            />
            <v-list-item
              title="Usuario desde"
              :subtitle="formatDate(user.createdAt)"
              prepend-icon="mdi-calendar-outline"
            />
          </v-list>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="h-100">
          <v-card-item>
            <v-card-title class="text-subtitle-1 font-weight-bold">
              Cambiar contraseña
            </v-card-title>
          </v-card-item>
          <v-divider />

          <v-card-text>
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
            <v-alert
              v-if="success"
              type="success"
              density="compact"
              variant="tonal"
              class="mb-3"
              :text="success"
              closable
              @click:close="success = ''"
            />

            <v-form ref="formRef" @submit.prevent="save">
              <v-text-field
                v-model="formState.currentPassword"
                label="Contraseña actual"
                :type="showCurrent ? 'text' : 'password'"
                :append-inner-icon="showCurrent ? 'mdi-eye-off' : 'mdi-eye'"
                :rules="rules.current"
                :disabled="saving"
                class="mb-3"
                @click:append-inner="showCurrent = !showCurrent"
              />
              <v-text-field
                v-model="formState.newPassword"
                label="Nueva contraseña"
                :type="showNew ? 'text' : 'password'"
                :append-inner-icon="showNew ? 'mdi-eye-off' : 'mdi-eye'"
                :rules="rules.newPassword"
                :disabled="saving"
                class="mb-3"
                @click:append-inner="showNew = !showNew"
              />
              <v-text-field
                v-model="formState.confirmPassword"
                label="Confirmar nueva contraseña"
                :type="showConfirm ? 'text' : 'password'"
                :append-inner-icon="showConfirm ? 'mdi-eye-off' : 'mdi-eye'"
                :rules="rules.confirm"
                :disabled="saving"
                class="mb-3"
                @click:append-inner="showConfirm = !showConfirm"
              />

              <div class="d-flex justify-end">
                <v-btn
                  color="primary"
                  variant="tonal"
                  type="submit"
                  :loading="saving"
                  :disabled="saving"
                  prepend-icon="mdi-lock-reset"
                >
                  Actualizar contraseña
                </v-btn>
              </div>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>
