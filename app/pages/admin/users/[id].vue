<script setup lang="ts">
import { ROLE_LABELS, ROLES } from '~~/shared/auth'
import { formatDate } from '~~/shared/utils/datetime-helpers'
import { emailStatusMeta } from '~/utils/email-status'
import { API_PATHS } from '~/utils/api-paths'

definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const userId = computed(() => String(route.params.id))

const { user: authUser, authFetch } = useAuthState()
const snackbar = useSnackbarState()
const { currentUser, loading, error, fetchUserById, deleteUser } = useUserState()

const editOpen = ref(false)
const deleteOpen = ref(false)
const deleting = ref(false)
const resendingInvite = ref(false)

interface IEmailLogItem {
  _id: string
  email: string
  history?: Array<{
    status: string
    eventName?: string
    eventAt?: string
  }>
}
const emailLogs = ref<IEmailLogItem[]>([])
const emailHistory = computed(() =>
  emailLogs.value.length > 0 ? [...(emailLogs.value[0]?.history ?? [])].reverse() : [],
)

const isAdmin = computed(() => authUser.value?.role === ROLES.ADMIN)
const canDelete = computed(
  () => isAdmin.value && !!currentUser.value && currentUser.value._id !== authUser.value?._id,
)

const initials = computed(() =>
  currentUser.value
    ? currentUser.value.name
        .split(' ')
        .map((part) => part.charAt(0))
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?',
)

const roleLabel = computed(() =>
  currentUser.value
    ? ROLE_LABELS[currentUser.value.role as keyof typeof ROLE_LABELS] || currentUser.value.role
    : '',
)

const load = async () => {
  try {
    await fetchUserById(userId.value)
    if (isAdmin.value && currentUser.value) {
      const data = await authFetch<{ items: IEmailLogItem[] }>(API_PATHS.emails.list, {
        query: {
          search: currentUser.value.email,
          limit: 20,
          page: 1,
        },
      })
      emailLogs.value = data.items
    }
  } catch {
    // Error visible en VAlert.
  }
}

watch(userId, load, { immediate: true })

const goBack = () => navigateTo('/admin/users')

const onSaved = async () => {
  editOpen.value = false
  await load()
  snackbar.success('Usuario actualizado correctamente')
}

const removeUser = async () => {
  if (!currentUser.value) return
  deleting.value = true
  try {
    await deleteUser(currentUser.value._id)
    deleteOpen.value = false
    snackbar.success('Usuario eliminado')
    await navigateTo('/admin/users')
  } catch {
    // Error visible en VAlert.
  }
  deleting.value = false
}

const resendInvite = async () => {
  if (!currentUser.value) return
  resendingInvite.value = true
  try {
    const result = await authFetch<{ inviteSent?: boolean }>(
      API_PATHS.users.invite(currentUser.value._id),
      { method: 'POST' },
    )
    if (result.inviteSent) {
      snackbar.success('Invitación enviada')
    } else {
      snackbar.error('No se pudo enviar la invitación. Revisa la configuración de Brevo.')
    }
    await load()
  } catch {
    snackbar.error('No se pudo enviar la invitación')
  } finally {
    resendingInvite.value = false
  }
}
</script>

<template>
  <div>
    <div class="d-flex align-center ga-2 mb-3">
      <v-btn icon="mdi-arrow-left" variant="text" @click="goBack" />
      <h1 class="text-h6 font-weight-bold mt-0 mb-0">Detalle de usuario</h1>
      <v-spacer />
      <ClientOnly>
        <v-tooltip location="bottom" text="Ayuda sobre esta página">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              icon="mdi-help-circle-outline"
              variant="text"
              color="primary"
              to="/help?topic=usuarios"
            />
          </template>
        </v-tooltip>
      </ClientOnly>
    </div>

    <v-card v-if="currentUser" max-width="640" class="mx-auto">
      <v-card-item>
        <template #prepend>
          <v-avatar color="primary" variant="tonal" size="56">
            <span class="text-h6 font-weight-bold">{{ initials }}</span>
          </v-avatar>
        </template>

        <v-card-title class="text-h6 font-weight-bold">
          {{ currentUser.name }}
        </v-card-title>
        <v-card-subtitle>{{ currentUser.email }}</v-card-subtitle>

        <template #append>
          <div class="d-flex flex-column ga-1">
            <v-chip size="small" color="primary" variant="tonal">
              {{ roleLabel }}
            </v-chip>
            <v-chip size="small" variant="tonal" :color="currentUser.active ? 'success' : 'error'">
              {{ currentUser.active ? 'Activo' : 'Inactivo' }}
            </v-chip>
          </div>
        </template>
      </v-card-item>

      <v-divider />

      <v-list>
        <v-list-item title="Email" :subtitle="currentUser.email" prepend-icon="mdi-email-outline" />
        <v-list-item title="Rol" :subtitle="roleLabel" prepend-icon="mdi-shield-account-outline" />
        <v-list-item
          title="Estado"
          :subtitle="currentUser.active ? 'Activo' : 'Inactivo'"
          prepend-icon="mdi-account-check-outline"
        />
        <v-list-item title="Invitación" prepend-icon="mdi-email-send-outline">
          <template #subtitle>
            <v-chip
              size="small"
              variant="tonal"
              :color="emailStatusMeta(currentUser.emailStatus).color"
            >
              {{ emailStatusMeta(currentUser.emailStatus).label }}
            </v-chip>
          </template>
        </v-list-item>
        <v-list-item
          title="Creado"
          :subtitle="formatDate(currentUser.createdAt)"
          prepend-icon="mdi-calendar-outline"
        />
        <v-list-item
          v-if="currentUser.updatedAt"
          title="Última actualización"
          :subtitle="formatDate(currentUser.updatedAt)"
          prepend-icon="mdi-clock-outline"
        />
      </v-list>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-btn
          v-if="isAdmin"
          variant="text"
          color="primary"
          prepend-icon="mdi-email-send-outline"
          :loading="resendingInvite"
          :disabled="resendingInvite"
          @click="resendInvite"
        >
          Reenviar invitación
        </v-btn>
        <v-btn
          v-if="canDelete"
          variant="text"
          color="error"
          prepend-icon="mdi-delete-outline"
          @click="deleteOpen = true"
        >
          Eliminar
        </v-btn>
        <v-spacer />
        <v-btn variant="text" color="grey-darken-1" @click="goBack"> Volver </v-btn>
        <v-btn
          variant="tonal"
          prepend-icon="mdi-pencil-outline"
          @click="editOpen = true"
        >
          Editar
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-card v-else-if="loading" max-width="640" class="mx-auto">
      <v-skeleton-loader type="list-item-avatar-two-line, divider, list-item-three-line, actions" />
    </v-card>

    <v-card v-if="isAdmin && currentUser" max-width="640" class="mx-auto mt-4">
      <v-card-item>
        <v-card-title class="text-subtitle-1 font-weight-bold"> Historial de correos </v-card-title>
      </v-card-item>
      <v-divider />
      <v-list v-if="emailHistory.length">
        <v-list-item v-for="(log, index) in emailHistory" :key="index">
          <template #prepend>
            <v-icon :color="emailStatusMeta(log.status).color"> mdi-email-outline </v-icon>
          </template>
          <v-list-item-title>
            <v-chip size="x-small" variant="tonal" :color="emailStatusMeta(log.status).color">
              {{ emailStatusMeta(log.status).label }}
            </v-chip>
            <span class="ml-2 text-body-2">
              {{ formatDate(log.eventAt, 'DD/MM/YYYY HH:mm') }}
            </span>
          </v-list-item-title>
          <v-list-item-subtitle v-if="log.eventName" class="text-body-2">
            Evento: {{ log.eventName }}
          </v-list-item-subtitle>
        </v-list-item>
      </v-list>
      <v-card-text v-else class="text-medium-emphasis">
        Sin correos enviados a este usuario.
      </v-card-text>
    </v-card>

    <v-alert
      v-if="error"
      type="error"
      density="compact"
      variant="tonal"
      class="mt-4"
      :text="error"
      closable
      @click:close="error = ''"
    />

    <UsersFormDialog v-model="editOpen" :user="currentUser" @saved="onSaved" />

    <v-dialog v-model="deleteOpen" max-width="420" persistent>
      <v-card>
        <v-card-title class="text-subtitle-1"> Eliminar usuario </v-card-title>
        <v-card-text>
          ¿Seguro que quieres eliminar a
          <strong>{{ currentUser?.name }}</strong
          >? Esta acción no se puede deshacer.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" color="grey-darken-1" @click="deleteOpen = false"> Cancelar </v-btn>
          <v-btn
            color="error"
            variant="flat"
            :loading="deleting"
            :disabled="deleting"
            @click="removeUser"
          >
            Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
