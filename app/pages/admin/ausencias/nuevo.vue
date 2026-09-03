<script setup lang="ts">
import { ROLES } from '~~/shared/auth'
import { useAbsenceState } from '~/composables/states/useAbsenceState'

definePageMeta({
  middleware: 'auth',
})

const { user } = useAuthState()
const snackbar = useSnackbarState()
const { createRecord, error } = useAbsenceState()

const canManage = computed(() =>
  [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR, ROLES.SUPERADMIN].includes(user.value?.role as never),
)

const saving = ref(false)

const onSaved = async (data: Record<string, unknown>) => {
  saving.value = true
  try {
    await createRecord(data)
    snackbar.success('Ausencia registrada')
    navigateTo('/admin/ausencias')
  } catch {
    // Error visible en el VAlert.
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <CommonPageHeader
      title="Nueva ausencia"
      subtitle="Registra permisos, licencias, incapacidades o descansos"
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
      v-if="!canManage"
      type="warning"
      variant="tonal"
      class="mb-4"
      text="No tienes permisos para registrar ausencias."
    />
    <v-alert
      v-else-if="error"
      type="error"
      density="compact"
      variant="tonal"
      class="mb-4"
      :text="error"
      closable
      @click:close="error = ''"
    />

    <v-card v-if="canManage" :loading="saving" class="mx-auto" max-width="720">
      <v-card-text class="pt-4">
        <AbsenceForm @saved="onSaved" @cancel="navigateTo('/admin/ausencias')" />
      </v-card-text>
    </v-card>
  </div>
</template>
