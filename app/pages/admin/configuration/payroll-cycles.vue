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
    [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR, ROLES.SUPERADMIN].includes(user.value.role),
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

const deleteDialogOpen = ref(false)
const deleteTarget = ref<ICycleRow | null>(null)
const deleting = ref(false)

const openDelete = (item: ICycleRow) => {
  deleteTarget.value = item
  deleteDialogOpen.value = true
}

const confirmDelete = async () => {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await authFetch(API_PATHS.payrollCycles.detail(deleteTarget.value._id), {
      method: 'DELETE',
    })
    snackbar.success('Ciclo eliminado')
    deleteDialogOpen.value = false
    await load()
  } catch (err) {
    snackbar.error(
      (err as { data?: { message?: string } }).data?.message ||
        'No se pudo eliminar el ciclo.',
    )
  } finally {
    deleting.value = false
  }
}

// ---- Asignación masiva de empleados sin ciclo ----

const assignDialogOpen = ref(false)
const assignCycle = ref<ICycleRow | null>(null)
const candidates = ref<
  Array<{ _id: string; firstName: string; lastName: string; document: string }>
>([])
const selectedIds = ref<string[]>([])
const assignSearch = ref('')
const candidatesLoading = ref(false)
const assigning = ref(false)

const filteredCandidates = computed(() => {
  const query = assignSearch.value.trim().toLowerCase()
  if (!query) return candidates.value
  return candidates.value.filter((candidate) =>
    `${candidate.firstName} ${candidate.lastName} ${candidate.document}`
      .toLowerCase()
      .includes(query),
  )
})

const allSelected = computed(
  () =>
    filteredCandidates.value.length > 0 &&
    filteredCandidates.value.every((candidate) =>
      selectedIds.value.includes(candidate._id),
    ),
)

const toggleAll = () => {
  if (allSelected.value) {
    const filtered = new Set(filteredCandidates.value.map((c) => c._id))
    selectedIds.value = selectedIds.value.filter((id) => !filtered.has(id))
  } else {
    const ids = new Set(selectedIds.value)
    filteredCandidates.value.forEach((candidate) => ids.add(candidate._id))
    selectedIds.value = [...ids]
  }
}

const onToggleCandidate = (id: string, selected: boolean) => {
  selectedIds.value = selected
    ? [...selectedIds.value, id]
    : selectedIds.value.filter((value) => value !== id)
}

const openAssign = async (cycle: ICycleRow) => {
  assignCycle.value = cycle
  selectedIds.value = []
  assignSearch.value = ''
  assignDialogOpen.value = true
  candidatesLoading.value = true
  try {
    const data = await authFetch<{ items: typeof candidates.value }>(
      API_PATHS.payrollCycles.candidates(cycle._id),
    )
    candidates.value = data.items ?? []
  } catch (err) {
    snackbar.error(
      (err as { data?: { message?: string } }).data?.message ||
        'No se pudieron cargar los empleados.',
    )
  } finally {
    candidatesLoading.value = false
  }
}

const submitAssign = async () => {
  if (!assignCycle.value || selectedIds.value.length === 0) return
  assigning.value = true
  try {
    const data = await authFetch<{ updated: number }>(
      API_PATHS.payrollCycles.assign(assignCycle.value._id),
      { method: 'POST', body: { employeeIds: selectedIds.value } },
    )
    snackbar.success(`${data.updated} empleado(s) asignado(s) al ciclo`)
    assignDialogOpen.value = false
    await load()
  } catch (err) {
    snackbar.error(
      (err as { data?: { message?: string } }).data?.message ||
        'No se pudieron asignar los empleados.',
    )
  } finally {
    assigning.value = false
  }
}

// ---- Detalle de empleados del ciclo ----

const employeesDialogOpen = ref(false)
const detailCycle = ref<ICycleRow | null>(null)
const cycleEmployees = ref<
  Array<{
    _id: string
    firstName: string
    lastName: string
    document: string
    position?: string
  }>
>([])
const employeesLoading = ref(false)
const employeesSearch = ref('')

const filteredCycleEmployees = computed(() => {
  const query = employeesSearch.value.trim().toLowerCase()
  if (!query) return cycleEmployees.value
  return cycleEmployees.value.filter((employee) =>
    `${employee.firstName} ${employee.lastName} ${employee.document} ${employee.position ?? ''}`
      .toLowerCase()
      .includes(query),
  )
})

const openEmployees = async (cycle: ICycleRow) => {
  detailCycle.value = cycle
  employeesSearch.value = ''
  employeesDialogOpen.value = true
  employeesLoading.value = true
  try {
    const data = await authFetch<{ items: typeof cycleEmployees.value }>(
      API_PATHS.payrollCycles.employees(cycle._id),
    )
    cycleEmployees.value = data.items ?? []
  } catch (err) {
    snackbar.error(
      (err as { data?: { message?: string } }).data?.message ||
        'No se pudieron cargar los empleados del ciclo.',
    )
  } finally {
    employeesLoading.value = false
  }
}

// ---- Mover empleado a otro ciclo ----

const moveDialogOpen = ref(false)
const moveEmployee = ref<{
  _id: string
  firstName: string
  lastName: string
  document: string
} | null>(null)
const moveSource = ref<ICycleRow | null>(null)
const moveTarget = ref('')
const moving = ref(false)

const moveOptions = computed(() => {
  if (!moveSource.value) return []
  const options = cycles.value
    .filter((cycle) => cycle._id !== moveSource.value!._id)
    .map((cycle) => ({ title: cycle.name, value: cycle._id }))
  if (!moveSource.value.isDefault) {
    options.push({
      title: 'Ciclo por defecto (sin asignación)',
      value: '__default__',
    })
  }
  return options
})

const openMove = (
  employee: {
    _id: string
    firstName: string
    lastName: string
    document: string
  },
  cycle: ICycleRow,
) => {
  moveEmployee.value = employee
  moveSource.value = cycle
  moveTarget.value = ''
  moveDialogOpen.value = true
}

const submitMove = async () => {
  if (!moveEmployee.value || !moveSource.value) return
  moving.value = true
  try {
    await authFetch(API_PATHS.payrollCycles.move(moveSource.value._id), {
      method: 'POST',
      body: {
        employeeId: moveEmployee.value._id,
        toCycleId:
          moveTarget.value === '__default__' ? null : moveTarget.value || null,
      },
    })
    snackbar.success('Empleado movido de ciclo')
    moveDialogOpen.value = false
    await load()
    if (employeesDialogOpen.value) await openEmployees(moveSource.value)
  } catch (err) {
    snackbar.error(
      (err as { data?: { message?: string } }).data?.message ||
        'No se pudo mover al empleado.',
    )
  } finally {
    moving.value = false
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
          <v-btn
            size="small"
            variant="text"
            color="primary"
            :title="`Ver empleados de ${item.name}`"
            @click="openEmployees(item)"
          >
            {{ item.employeeCount ?? 0 }}
            <v-icon end size="small">mdi-account-details-outline</v-icon>
          </v-btn>
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
            @click="openDelete(item)"
          />
          <v-btn
            v-if="canManage && !item.isDefault"
            icon="mdi-account-plus-outline"
            size="small"
            variant="text"
            color="success"
            title="Asignar empleados sin ciclo"
            @click="openAssign(item)"
          />
          <v-btn
            v-if="canManage"
            icon="mdi-account-group-outline"
            size="small"
            variant="text"
            color="info"
            title="Ver empleados del ciclo"
            @click="openEmployees(item)"
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

    <v-dialog v-model="assignDialogOpen" max-width="640">
      <v-card v-if="assignCycle">
        <v-card-item>
          <template #prepend>
            <v-avatar color="success" variant="tonal" size="44">
              <v-icon color="success">mdi-account-plus-outline</v-icon>
            </v-avatar>
          </template>
          <v-card-title class="text-subtitle-1 font-weight-bold">
            Asignar empleados sin ciclo
          </v-card-title>
          <v-card-subtitle>
            {{ assignCycle.name }} · {{ candidates.length }} candidato(s)
          </v-card-subtitle>
          <template #append>
            <v-btn
              icon="mdi-close"
              variant="text"
              size="small"
              @click="assignDialogOpen = false"
            />
          </template>
        </v-card-item>
        <v-divider />
        <v-card-text>
          <v-text-field
            v-model="assignSearch"
            label="Buscar"
            prepend-inner-icon="mdi-magnify"
            variant="solo"
            flat
            bg-color="surface-light"
            clearable
            class="mb-3"
          />
          <v-checkbox
            label="Seleccionar todos (filtrados)"
            :model-value="allSelected"
            density="compact"
            hide-details
            class="mb-1"
            @update:model-value="toggleAll"
          />
          <v-list
            v-if="filteredCandidates.length"
            density="compact"
            max-height="320"
            class="overflow-y-auto border rounded-lg"
          >
            <v-list-item
              v-for="candidate in filteredCandidates"
              :key="candidate._id"
            >
              <template #prepend>
                <v-checkbox
                  :model-value="selectedIds.includes(candidate._id)"
                  density="compact"
                  hide-details
                  @update:model-value="(value: unknown) =>
                    onToggleCandidate(candidate._id, Boolean(value))"
                />
              </template>
              <v-list-item-title class="text-body-2">
                {{ candidate.firstName }} {{ candidate.lastName }}
              </v-list-item-title>
              <v-list-item-subtitle class="text-caption">
                {{ candidate.document }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
          <v-alert
            v-else
            type="info"
            variant="tonal"
            density="compact"
            class="mt-2"
            :text="
              candidatesLoading
                ? 'Cargando empleados…'
                : 'No hay empleados activos sin ciclo.'
            "
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <span class="text-caption text-medium-emphasis me-2">
            {{ selectedIds.length }} seleccionado(s)
          </span>
          <v-btn variant="text" @click="assignDialogOpen = false">
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            variant="tonal"
            :loading="assigning"
            :disabled="selectedIds.length === 0"
            @click="submitAssign"
          >
            Asignar
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
            ¿Eliminar el ciclo?
          </v-card-title>
          <v-card-subtitle v-if="deleteTarget">
            {{ deleteTarget.name }}
          </v-card-subtitle>
        </v-card-item>
        <v-divider />
        <v-card-text>
          Esta acción no se puede deshacer. El ciclo debe estar sin empleados
          asignados para poder eliminarlo.
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

    <v-dialog v-model="employeesDialogOpen" max-width="560">
      <v-card v-if="detailCycle">
        <v-card-item>
          <template #prepend>
            <v-avatar color="info" variant="tonal" size="44">
              <v-icon color="info">mdi-account-group-outline</v-icon>
            </v-avatar>
          </template>
          <v-card-title class="text-subtitle-1 font-weight-bold">
            Empleados del ciclo
          </v-card-title>
          <v-card-subtitle>
            {{ detailCycle.name }} · {{ cycleEmployees.length }} empleado(s)
          </v-card-subtitle>
          <template #append>
            <v-btn
              icon="mdi-close"
              variant="text"
              size="small"
              @click="employeesDialogOpen = false"
            />
          </template>
        </v-card-item>
        <v-divider />
        <v-card-text>
          <v-text-field
            v-model="employeesSearch"
            label="Buscar"
            prepend-inner-icon="mdi-magnify"
            variant="solo"
            flat
            bg-color="surface-light"
            clearable
            class="mb-3"
          />
          <v-list
            v-if="filteredCycleEmployees.length"
            density="compact"
            max-height="360"
            class="overflow-y-auto border rounded-lg"
          >
            <v-list-item
              v-for="employee in filteredCycleEmployees"
              :key="employee._id"
            >
              <template #prepend>
                <v-avatar size="36" color="primary" variant="tonal">
                  <v-icon size="small">mdi-account-outline</v-icon>
                </v-avatar>
              </template>
              <v-list-item-title class="text-body-2">
                {{ employee.firstName }} {{ employee.lastName }}
              </v-list-item-title>
              <v-list-item-subtitle class="text-caption">
                {{ employee.document }}<template v-if="employee.position">
                  · {{ employee.position }}
                </template>
              </v-list-item-subtitle>
              <template #append>
                <v-btn
                  v-if="canManage"
                  icon="mdi-swap-horizontal"
                  size="small"
                  variant="text"
                  color="info"
                  title="Mover de ciclo"
                  @click="openMove(employee, detailCycle)"
                />
              </template>
            </v-list-item>
          </v-list>
          <v-alert
            v-else
            type="info"
            variant="tonal"
            density="compact"
            class="mt-2"
            :text="
              employeesLoading
                ? 'Cargando empleados…'
                : 'El ciclo no tiene empleados asignados.'
            "
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="employeesDialogOpen = false">
            Cerrar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="moveDialogOpen" max-width="480">
      <v-card v-if="moveEmployee && moveSource">
        <v-card-item>
          <template #prepend>
            <v-avatar color="info" variant="tonal" size="44">
              <v-icon color="info">mdi-swap-horizontal</v-icon>
            </v-avatar>
          </template>
          <v-card-title class="text-subtitle-1 font-weight-bold">
            Mover de ciclo
          </v-card-title>
          <v-card-subtitle>
            {{ moveEmployee.firstName }} {{ moveEmployee.lastName }} ·
            {{ moveEmployee.document }} · desde {{ moveSource.name }}
          </v-card-subtitle>
          <template #append>
            <v-btn
              icon="mdi-close"
              variant="text"
              size="small"
              @click="moveDialogOpen = false"
            />
          </template>
        </v-card-item>
        <v-divider />
        <v-card-text>
          <v-select
            v-model="moveTarget"
            :items="moveOptions"
            label="Ciclo destino"
            class="mb-3"
          />
          <p class="text-caption text-medium-emphasis">
            El cambio aplica a las nóminas futuras; las ya liquidadas
            conservan su período (PeriodoNomina) y no se modifican.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="moveDialogOpen = false">
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            variant="tonal"
            :loading="moving"
            :disabled="!moveTarget"
            @click="submitMove"
          >
            Mover
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
