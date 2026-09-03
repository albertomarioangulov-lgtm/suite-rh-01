<script setup lang="ts">
import { ROLES } from '~~/shared/auth'
import { formatCOP } from '~/utils/number-helpers'
import { API_PATHS } from '~/utils/api-paths'
import {
  DIAN_CONCEPT_BLOCKS,
  PAYROLL_CONCEPT_CALCULATIONS,
  type PayrollConceptDianBlock,
  type PayrollConceptType,
} from '~~/shared/payroll-concepts'

definePageMeta({ middleware: 'auth' })

const { user, authFetch } = useAuthState()
const snackbar = useSnackbarState()

const canManage = computed(
  () =>
    !!user.value &&
    [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR, ROLES.SUPERADMIN].includes(user.value.role),
)

interface IConceptRow {
  _id: string
  type: PayrollConceptType
  code: string
  name: string
  description?: string
  dianBlock: PayrollConceptDianBlock
  calculation: 'fijo' | 'porcentaje'
  value: number
  active: boolean
  sortOrder: number
}

const items = ref<IConceptRow[]>([])
const loading = ref(false)
const error = ref('')
const search = ref('')
const typeFilter = ref<'all' | PayrollConceptType>('all')

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const data = await authFetch<{ items: IConceptRow[] }>(
      API_PATHS.payrollConcepts.list,
    )
    items.value = data.items ?? []
  } catch (err) {
    error.value =
      (err as { data?: { message?: string } }).data?.message ||
      'No se pudieron cargar los conceptos.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

const filteredItems = computed(() => {
  const query = search.value.trim().toLowerCase()
  return items.value.filter((item) => {
    if (typeFilter.value !== 'all' && item.type !== typeFilter.value) {
      return false
    }
    if (!query) return true
    return (
      item.name.toLowerCase().includes(query) ||
      item.code.toLowerCase().includes(query)
    )
  })
})

const typeLabel = (type: PayrollConceptType) =>
  type === 'devengo' ? 'Devengo' : 'Deducción'

const calculationLabel = (calculation: string) =>
  calculation === 'porcentaje' ? '% del salario base' : 'Valor fijo'

// ---- Formulario ----

const dialogOpen = ref(false)
const editingId = ref('')
const saving = ref(false)
const form = reactive({
  type: 'devengo' as PayrollConceptType,
  code: '',
  name: '',
  description: '',
  dianBlock: '' as PayrollConceptDianBlock | '',
  calculation: 'fijo' as 'fijo' | 'porcentaje',
  value: 0,
  active: true,
  sortOrder: 0,
})

const dianBlockOptions = computed(() =>
  Object.entries(DIAN_CONCEPT_BLOCKS)
    .filter(([, definition]) => definition.type === form.type)
    .map(([value, definition]) => ({
      title: definition.label,
      value,
    })),
)

watch(
  () => form.type,
  (type) => {
    const definition = form.dianBlock
      ? DIAN_CONCEPT_BLOCKS[form.dianBlock as PayrollConceptDianBlock]
      : null
    if (definition && definition.type !== type) form.dianBlock = ''
  },
)

const openCreate = () => {
  editingId.value = ''
  Object.assign(form, {
    type: 'devengo',
    code: '',
    name: '',
    description: '',
    dianBlock: '',
    calculation: 'fijo',
    value: 0,
    active: true,
    sortOrder: 0,
  })
  dialogOpen.value = true
}

const openEdit = (item: IConceptRow) => {
  editingId.value = item._id
  Object.assign(form, {
    type: item.type,
    code: item.code,
    name: item.name,
    description: item.description ?? '',
    dianBlock: item.dianBlock,
    calculation: item.calculation,
    value: item.value,
    active: item.active,
    sortOrder: item.sortOrder,
  })
  dialogOpen.value = true
}

const save = async () => {
  if (!form.code.trim() || !form.name.trim() || !form.dianBlock) {
    snackbar.error('Completa código, nombre y bloque DIAN.')
    return
  }
  saving.value = true
  try {
    const payload = {
      type: form.type,
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      dianBlock: form.dianBlock,
      calculation: form.calculation,
      value: Number(form.value) || 0,
      active: form.active,
      sortOrder: Number(form.sortOrder) || 0,
    }
    if (editingId.value) {
      await authFetch(API_PATHS.payrollConcepts.detail(editingId.value), {
        method: 'PUT',
        body: payload,
      })
      snackbar.success('Concepto actualizado')
    } else {
      await authFetch(API_PATHS.payrollConcepts.create, {
        method: 'POST',
        body: payload,
      })
      snackbar.success('Concepto creado')
    }
    dialogOpen.value = false
    await load()
  } catch (err) {
    snackbar.error(
      (err as { data?: { message?: string } }).data?.message ||
        'No se pudo guardar el concepto.',
    )
  } finally {
    saving.value = false
  }
}

const deleteDialogOpen = ref(false)
const deleteTarget = ref<IConceptRow | null>(null)
const deleting = ref(false)

const openDelete = (item: IConceptRow) => {
  deleteTarget.value = item
  deleteDialogOpen.value = true
}

const confirmDelete = async () => {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await authFetch(API_PATHS.payrollConcepts.detail(deleteTarget.value._id), {
      method: 'DELETE',
    })
    snackbar.success('Concepto eliminado')
    deleteDialogOpen.value = false
    await load()
  } catch (err) {
    snackbar.error(
      (err as { data?: { message?: string } }).data?.message ||
        'No se pudo eliminar el concepto.',
    )
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div>
    <CommonPageHeader
      title="Conceptos de nómina"
      subtitle="Catálogo de devengos y deducciones configurables que se reflejan en el DSNE"
    >
      <template #actions>
        <v-btn
          v-if="canManage"
          color="primary"
          variant="tonal"
          prepend-icon="mdi-plus"
          @click="openCreate"
        >
          Nuevo concepto
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
      <CommonListToolbar
        v-model:search="search"
        search-placeholder="Buscar por nombre o código…"
      >
        <template #filters>
          <v-chip-group v-model="typeFilter" mandatory class="ml-2">
            <v-chip value="all" size="small" variant="tonal">
              Todos
            </v-chip>
            <v-chip value="devengo" size="small" variant="tonal">
              Devengos
            </v-chip>
            <v-chip value="deduccion" size="small" variant="tonal">
              Deducciones
            </v-chip>
          </v-chip-group>
        </template>
      </CommonListToolbar>

      <v-data-table
        :headers="[
          { title: 'Código', key: 'code' },
          { title: 'Nombre', key: 'name' },
          { title: 'Tipo', key: 'type' },
          { title: 'Bloque DIAN', key: 'dianBlock' },
          { title: 'Cálculo', key: 'calculation' },
          { title: 'Valor', key: 'value', align: 'end' },
          { title: 'Estado', key: 'active' },
          { title: '', key: 'actions', sortable: false, align: 'end' },
        ]"
        :items="filteredItems"
        density="compact"
        hover
        class="rounded-lg overflow-hidden"
      >
        <template #[`item.type`]="{ item }">
          <v-chip
            size="x-small"
            :color="item.type === 'devengo' ? 'success' : 'warning'"
            variant="tonal"
          >
            {{ typeLabel(item.type) }}
          </v-chip>
        </template>
        <template #[`item.dianBlock`]="{ item }">
          {{ DIAN_CONCEPT_BLOCKS[item.dianBlock]?.label ?? item.dianBlock }}
        </template>
        <template #[`item.calculation`]="{ item }">
          {{ calculationLabel(item.calculation) }}
        </template>
        <template #[`item.value`]="{ item }">
          {{ item.calculation === 'porcentaje' ? `${item.value}%` : formatCOP(item.value) }}
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
            title="Editar concepto"
            @click="openEdit(item)"
          />
          <v-btn
            v-if="canManage"
            icon="mdi-delete-outline"
            size="small"
            variant="text"
            color="error"
            title="Eliminar concepto"
            @click="openDelete(item)"
          />
        </template>
        <template #no-data>
          No hay conceptos. Crea uno para personalizar la liquidación y el DSNE.
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="dialogOpen" max-width="560">
      <v-card>
        <v-card-item>
          <template #prepend>
            <v-avatar color="primary" variant="tonal" size="44">
              <v-icon color="primary">mdi-tag-plus-outline</v-icon>
            </v-avatar>
          </template>
          <v-card-title class="text-subtitle-1 font-weight-bold">
            {{ editingId ? 'Editar concepto' : 'Nuevo concepto' }}
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
            <v-col cols="12" sm="6">
              <v-select
                v-model="form.type"
                :items="[
                  { title: 'Devengo', value: 'devengo' },
                  { title: 'Deducción', value: 'deduccion' },
                ]"
                label="Tipo"
                class="mb-3"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.code"
                label="Código interno"
                hint="Máx. 30 caracteres, ej. BONO_NAV"
                persistent-hint
                class="mb-3"
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="form.name"
                label="Nombre"
                class="mb-3"
              />
            </v-col>
            <v-col cols="12">
              <v-select
                v-model="form.dianBlock"
                :items="dianBlockOptions"
                label="Bloque del DSNE (DIAN)"
                item-title="title"
                item-value="value"
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
            <v-col cols="12" sm="6">
              <v-select
                v-model="form.calculation"
                :items="PAYROLL_CONCEPT_CALCULATIONS.map((value) => ({
                  title: value === 'fijo' ? 'Valor fijo' : 'Porcentaje del salario base',
                  value,
                }))"
                label="Cálculo"
                class="mb-3"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.value"
                label="Valor"
                type="number"
                min="0"
                :suffix="form.calculation === 'porcentaje' ? '%' : '$'"
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
            <v-col cols="12" sm="6">
              <v-switch
                v-model="form.active"
                label="Concepto activo"
                color="success"
                inset
                class="mt-2"
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
            {{ editingId ? 'Guardar cambios' : 'Crear concepto' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialogOpen" max-width="440">
      <v-card>
        <v-card-item>
          <template #prepend>
            <v-avatar color="error" variant="tonal" size="44">
              <v-icon color="error">mdi-alert-outline</v-icon>
            </v-avatar>
          </template>
          <v-card-title class="text-subtitle-1 font-weight-bold">
            ¿Eliminar el concepto?
          </v-card-title>
          <v-card-subtitle v-if="deleteTarget">
            {{ deleteTarget.name }}
          </v-card-subtitle>
        </v-card-item>
        <v-divider />
        <v-card-text>
          Esta acción no se puede deshacer. Las nóminas ya liquidadas no se
          modifican.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialogOpen = false">
            Cancelar
          </v-btn>
          <v-btn
            color="error"
            variant="tonal"
            :loading="deleting"
            @click="confirmDelete"
          >
            Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
