<script setup lang="ts">
import { ROLES } from '~~/shared/auth'
import type { ICompanyView } from '~/composables/states/useCompanyState'

definePageMeta({
  middleware: 'auth',
})

const { user } = useAuthState()
const snackbar = useSnackbarState()
const { company, loading, error, fetchCompany, updateCompany } =
  useCompanyState()

const isAdmin = computed(() => user.value?.role === ROLES.ADMIN)
const formOpen = ref(false)

onMounted(async () => {
  try {
    await fetchCompany()
  } catch {
    // Estado vacío (sin empresa): el admin puede registrarla.
  }
})

const openForm = () => {
  error.value = ''
  formOpen.value = true
}

const onSaved = async (data: Record<string, unknown>) => {
  try {
    await updateCompany(data as Partial<ICompanyView>)
    snackbar.success('Configuración guardada correctamente')
    await fetchCompany()
  } catch {
    // Error visible en el VAlert.
  }
}
</script>

<template>
  <div>
    <CommonPageHeader
      title="Configuración"
      subtitle="Datos de la empresa y parámetros legales del sistema"
    >
      <template #actions>
        <v-btn
          v-if="isAdmin"
          :color="company ? undefined : 'primary'"
          variant="tonal"
          :prepend-icon="company ? 'mdi-pencil-outline' : 'mdi-plus'"
          @click="openForm"
        >
          {{ company ? 'Editar' : 'Registrar empresa' }}
        </v-btn>
      </template>
    </CommonPageHeader>

    <CommonConfigurationTabs />

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

    <v-skeleton-loader v-if="loading && !company" type="article, actions" />

    <CompanyConfigCard v-else-if="company" :company="company" />

    <v-alert
      v-else-if="!isAdmin"
      type="info"
      variant="tonal"
      density="compact"
      class="mt-4"
      text="La configuración de la empresa aún no está disponible."
    />

    <v-card v-else class="text-center pa-8 mt-4">
      <v-icon size="48" color="primary" class="mb-3">
        mdi-office-building-plus-outline
      </v-icon>
      <h2 class="text-h6 font-weight-bold mb-1">Aún no hay empresa registrada</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Registra la empresa para activar el sistema.
      </p>
      <v-btn
        color="primary"
        variant="tonal"
        prepend-icon="mdi-plus"
        @click="openForm"
      >
        Registrar empresa
      </v-btn>
    </v-card>

    <CompanyFormDialog
      v-model="formOpen"
      :company="company"
      @saved="onSaved"
    />
  </div>
</template>
