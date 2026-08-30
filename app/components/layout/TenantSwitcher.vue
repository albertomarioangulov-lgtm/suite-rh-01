<script setup lang="ts">
import { API_BASE } from '~/utils/api-paths'

interface ITenantOption {
  _id: string
  name: string
}

const { user, fetchMe } = useAuthState()
const snackbar = useSnackbarState()

const tenants = useState<ITenantOption[]>('tenant-options', () => [])
const activeTenantId = useState<string | null>('tenant-active', () => null)
const loading = ref(false)

const multiTenant = computed(
  () => !!user.value?.tenantIds && user.value.tenantIds.length > 1,
)

const loadTenants = async () => {
  if (!import.meta.client) return
  loading.value = true
  try {
    const data = await $fetch<{
      items: ITenantOption[]
      activeTenantId: string | null
    }>(`${API_BASE}/auth/tenants`)
    tenants.value = data.items
    activeTenantId.value = data.activeTenantId
  } catch {
    // Sin acceso a la lista: el selector queda vacío.
  } finally {
    loading.value = false
  }
}

onMounted(loadTenants)

const switchTenant = async (tenantId: string) => {
  loading.value = true
  try {
    await $fetch(`${API_BASE}/auth/tenant`, {
      method: 'PUT',
      body: { tenantId },
    })
    activeTenantId.value = tenantId
    await fetchMe()
    snackbar.success('Empresa cambiada')
    await navigateTo('/home')
  } catch {
    snackbar.error('No se pudo cambiar de empresa')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-select
    v-if="multiTenant && tenants.length > 1"
    :model-value="activeTenantId"
    :items="tenants"
    item-title="name"
    item-value="_id"
    variant="plain"
    density="compact"
    hide-details
    :loading="loading"
    class="mx-2"
    style="max-width: 220px"
    @update:model-value="switchTenant"
  />
</template>
