<script setup lang="ts">
import { ROLES } from '~~/shared/auth'
import { API_PATHS } from '~/utils/api-paths'
import {
  PAYROLL_FREQUENCIES,
  type PayrollFrequency,
} from '~~/shared/payroll-period'

definePageMeta({ middleware: 'auth' })

const { user, authFetch } = useAuthState()
const snackbar = useSnackbarState()

const canManage = computed(
  () =>
    !!user.value &&
    [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR].includes(user.value.role),
)

interface ICycleRow {
  _id: string
  name: string
  frequency: PayrollFrequency
  description?: string
  isDefault?: boolean
  active: boolean
  sortOrder: number
  employeeCount?: number
}

const items = ref<ICycleRow[]>([])
const loading = ref(false)
const error = ref('')

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const data = await authFetch<{ items: ICycleRow[] }>(
      API_PATHS.payrollCycles.list,
    )
    items.value = data.items ?? []
  } catch (err) {
    error.value =
      (err as { data?: { message?: string } }).data?.message ||
      'No se pudieron cargar los ciclos.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

const frequencyLabel = (frequency: PayrollFrequency) =>
  PAYROLL_FREQUENCIES[frequency]?.label ?? frequency

// ---- Formulario ----

const dialogOpen = ref(false)
const editingId = ref('')
const saving = ref(false)
const form = reactive({
  name: '',
  frequency: 'mensual' as PayrollFrequency,
  description: '',
  active: true,
  sortOrder: 0,
})

const editingIsDefault = computed(
  () =>
    items.value.find((item) => item._id === editingId.value)?.isDefault ??
    false,
)

const openCreate = () => {
  editingId.value = ''
  Object.assign(form, {
    name: '',
    frequency: 'mensual',
    description: '',
    active: true,
    sortOrder: 0,
  })
  dialogOpen.value = true
}

const openEdit = (item: ICycleRow) => {
  editingId.value = item._id
  Object.assign(form, {
    name: item.name,
    frequency: item.frequency,
    description: item.description ?? '',
    active: item.active,
    sortOrder: item.sortOrder,
  })
  dialogOpen.value = true
}

const save = async () => {
  if (!form.name.trim()) {
    snackbar.error('Ingresa el nombre del ciclo.')
    return
  }
  saving.value = true
  try {
    const payload = {
      name: form.name.trim(),
      frequency: form.frequency,
      description: form.description.trim() || undefined,
      active: form.active,
      sortOrder: Number(form.sortOrder) || 0,
    }
    if (editingId.value) {
      await authFetch(API_PATHS.payrollCycles.detail(editingId.value), {
        method: 'PUT',
        body: payload,
      })
      snackbar.success('Ciclo actualizado')
    } else {
      await authFetch(API_PATHS.payrollCycles.create, {
        method: 'POST',
        body: payload,
      })
      snackbar.success('Ciclo creado')
    }
    dialogOpen.value = false
    await load()
  } catch (err) {
    snackbar.error(
      (err as { data?: { message?: string } }).data?.message ||
        'No se pudo guardar el ciclo.',
    )
  } finally {
    saving.value = false
  }
}

const remove = async (item: ICycleRow) => {
  if (
    !confirm(
      `¿Eliminar el ciclo "${item.name}"? Debe estar sin empleados asignados.`,
    )
  ) {
    return
  }
  try {
    await authFetch(API_PATHS.payrollCycles.detail(item._id), {
      method: 'DELETE',
    })
    snackbar.success('Ciclo eliminado')
    await load()
  } catch (err) {
    snackbar.error(
      (err as { data?: { message?: string } }).data?.message ||
        'No se pudo eliminar el ciclo.',
    )
  }
}
</script>

<template>
  <div>
    <CommonPageHeader
      title="Ciclos de pago"
      subtitle="Agrupa empleados por frecuencia de liquidación; cada nómina pertenece a un ciclo"
    >
      <template #actions>
        <v-btn
          v-if="canManage"
          color="primary"
          variant="tonal"
          prepend-icon="mdi-plus"
          @click="openCreate"
        >
          Nuevo ciclo
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

    <v-card :loading="loading">
      <v-data-table
        :headers="[
          { title: 'Nombre', key: 'name' },
          { title: 'Frecuencia', key: 'frequency' },
          { title: 'Empleados activos', key: 'employeeCount', align: 'end' },
          { title: 'Estado', key: 'active' },
          { title: '', key: 'actions', sortable: false, align: 'end' },
        ]"
        :items="items"
        density="compact"
        hover
        class="rounded-lg overflow-hidden"
      >
        <template #[`item.name`]="{ item }">
          <div class="d-flex align-center ga-2">
            <span class="font-weight-medium">{{ item.name }}</span>
            <v-chip
              v-if="item.isDefault"
              size="x-small"
              color="primary"
              variant="tonal"
            >
              Por defecto
            </v-chip>
          </div>
          <div
            v-if="item.description"
            class="text-caption text-medium-emphasis"
          >
            {{ item.description }}
          </div>
        </template>
        <template #[`item.frequency`]="{ item }">
          {{ frequencyLabel(item.frequency) }}
        </template>
        <template #[`item.employeeCount`]="{ item }">
          {{ item.employeeCount ?? 0 }}
        </template>
        <template #[`item.active`]="{ item }">
          <v-chip
            size="x-small"
            :color="item.active ? 'success' : 'default'"
            variant="tonal"
          >
            {{ item.active ? 'Activo' : 'Inactivo' }}
          </v-chip>
        </template>
        <template #[`item.actions`]="{ item }">
          <v-btn
            v-if="canManage"
            icon="mdi-pencil-outline"
            size="small"
            variant="text"
            color="primary"
            title="Editar ciclo"
            @click="openEdit(item)"
          />
          <v-btn
            v-if="canManage && !item.isDefault"
            icon="mdi-delete-outline"
            size="small"
            variant="text"
            color="error"
            title="Eliminar ciclo"
            @click="remove(item)"
          />
        </template>
        <template #no-data>
          No hay ciclos. El sistema crea uno por defecto con la frecuencia de la empresa.
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="dialogOpen" max-width="520">
      <v-card>
        <v-card-item>
          <template #prepend>
            <v-avatar color="primary" variant="tonal" size="44">
              <v-icon color="primary">mdi-calendar-refresh-outline</v-icon>
            </v-avatar>
          </template>
          <v-card-title class="text-subtitle-1 font-weight-bold">
            {{ editingId ? 'Editar ciclo' : 'Nuevo ciclo' }}
          </v-card-title>
          <template #append>
            <v-btn
              icon="mdi-close"
              variant="text"
              size="small"
              @click="dialogOpen = false"
            />
          </template>
        </v-card-item>
        <v-divider />
        <v-card-text>
          <v-row density="compact">
            <v-col cols="12">
              <v-text-field
                v-model="form.name"
                label="Nombre"
                hint="Ej. Quincenal empleados de planta, Semanal jornales"
                persistent-hint
                class="mb-3"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="form.frequency"
                :items="Object.entries(PAYROLL_FREQUENCIES).map(
                  ([value, definition]) => ({
                    title: definition.label,
                    value,
                  }),
                )"
                label="Frecuencia"
                class="mb-3"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.sortOrder"
                label="Orden"
                type="number"
                min="0"
                class="mb-3"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="form.description"
                label="Descripción"
                rows="2"
                auto-grow
                class="mb-3"
              />
            </v-col>
            <v-col cols="12">
              <v-switch
                v-model="form.active"
                label="Ciclo activo"
                color="success"
                inset
                :disabled="editingIsDefault"
                :hint="editingIsDefault ? 'El ciclo por defecto siempre está activo' : ''"
                persistent-hint
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialogOpen = false">
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            variant="tonal"
            :loading="saving"
            @click="save"
          >
            {{ editingId ? 'Guardar cambios' : 'Crear ciclo' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
