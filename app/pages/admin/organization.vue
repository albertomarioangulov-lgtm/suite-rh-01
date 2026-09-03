<script setup lang="ts">
import { API_PATHS } from '~/utils/api-paths'
import VChart from 'vue-echarts'

definePageMeta({ middleware: 'auth' })

const { authFetch } = useAuthState()
const snackbar = useSnackbarState()

const tab = ref(0)
const loading = ref(false)
const error = ref('')

interface IDepartmentView {
  id: string
  name: string
  code: string
  description: string
  color: string
  managerId: string | null
  managerName: string
  active: boolean
}

interface IPositionView {
  id: string
  title: string
  departmentId: string | null
  department: string
  description: string
  functions: string[]
  requirements: string[]
  minSalary: number | null
  maxSalary: number | null
}

const departments = ref<IDepartmentView[]>([])
const positions = ref<IPositionView[]>([])
const employeeOptions = ref<Array<{ title: string; value: string }>>([])
const employeesForChart = ref<Array<Record<string, any>>>([])

const loadDepartments = async () => {
  loading.value = true
  try {
    const data = await authFetch<{ items: IDepartmentView[] }>(
      API_PATHS.organization.departments,
    )
    departments.value = data.items
  } catch {
    error.value = 'No se pudieron cargar las áreas.'
  } finally {
    loading.value = false
  }
}

const loadPositions = async () => {
  loading.value = true
  try {
    const data = await authFetch<{ items: IPositionView[] }>(
      API_PATHS.organization.positions,
    )
    positions.value = data.items
  } catch {
    error.value = 'No se pudieron cargar los cargos.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadDepartments()
  loadPositions()
  loadEmployees()
})

const loadEmployees = async () => {
  try {
    const data = await authFetch<{
      items: Array<{
        _id: string
        firstName: string
        lastName: string
        position: string
        department?: { _id?: string; name?: string } | string | null
        manager?: { _id?: string; firstName?: string; lastName?: string } | string | null
      }>
    }>(API_PATHS.employees.list, {
      query: { limit: 100, active: 'true' },
    })
    employeeOptions.value = data.items.map((employee) => ({
      title: `${employee.firstName} ${employee.lastName}`,
      value: employee._id,
    }))
    employeesForChart.value = data.items
  } catch {
    // Sin empleados para el organigrama.
  }
}

// ---- Diálogos ----
const departmentDialog = ref(false)
const colorMenu = ref(false)
const departmentForm = ref({
  id: '',
  name: '',
  code: '',
  description: '',
  color: '#1867C0',
  manager: '',
})
const savingDepartment = ref(false)

/** Paleta para sugerir colores de área visualmente distintos. */
const AREA_COLOR_PALETTE = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#06B6D4',
  '#F97316',
  '#EC4899',
  '#84CC16',
  '#14B8A6',
  '#6366F1',
  '#E11D48',
  '#0EA5E9',
  '#A855F7',
  '#22C55E',
  '#F43F5E',
]

const usedAreaColors = () =>
  new Set(
    departments.value
      .map((department) => (department.color ?? '').toLowerCase())
      .filter(Boolean),
  )

/**
 * Sugiere un color que no repita los de las áreas existentes. Si la paleta
 * se agota, rota para mantener variedad.
 */
const suggestAreaColor = (): string => {
  const used = usedAreaColors()
  const free = AREA_COLOR_PALETTE.find(
    (color) => !used.has(color.toLowerCase()),
  )
  if (free) return free
  return AREA_COLOR_PALETTE[departments.value.length % AREA_COLOR_PALETTE.length]
}

/** Sugiere un color distinto al actual (y que no repita áreas existentes). */
const suggestAnotherColor = () => {
  const used = usedAreaColors()
  const current = departmentForm.value.color.toLowerCase()
  const free = AREA_COLOR_PALETTE.find(
    (color) =>
      color.toLowerCase() !== current && !used.has(color.toLowerCase()),
  )
  if (free) {
    departmentForm.value.color = free
    return
  }
  const index = AREA_COLOR_PALETTE.findIndex(
    (color) => color.toLowerCase() === current,
  )
  departmentForm.value.color =
    AREA_COLOR_PALETTE[(index + 1) % AREA_COLOR_PALETTE.length]
}

const openDepartment = (department?: IDepartmentView) => {
  departmentForm.value = department
    ? {
        id: department.id,
        name: department.name,
        code: department.code,
        description: department.description,
        color: department.color || '#1867C0',
        manager: department.managerId ?? '',
      }
    : {
        id: '',
        name: '',
        code: '',
        description: '',
        color: suggestAreaColor(),
        manager: '',
      }
  departmentDialog.value = true
}

const saveDepartment = async () => {
  if (!departmentForm.value.name.trim()) return
  savingDepartment.value = true
  error.value = ''
  try {
    const url = departmentForm.value.id
      ? API_PATHS.organization.department(departmentForm.value.id)
      : API_PATHS.organization.departments
    await authFetch(url, {
      method: departmentForm.value.id ? 'PUT' : 'POST',
      body: {
        name: departmentForm.value.name.trim(),
        code: departmentForm.value.code.trim(),
        description: departmentForm.value.description.trim(),
        color: departmentForm.value.color,
        managerId: departmentForm.value.manager || null,
      },
    })
    snackbar.success(departmentForm.value.id ? 'Área actualizada' : 'Área creada')
    departmentDialog.value = false
    await loadDepartments()
  } catch {
    error.value = 'No se pudo guardar el área.'
  } finally {
    savingDepartment.value = false
  }
}

const deleteDepartment = async (department: IDepartmentView) => {
  if (!confirm(`¿Eliminar el área "${department.name}"?`)) return
  try {
    await authFetch(API_PATHS.organization.department(department.id), {
      method: 'DELETE',
    })
    snackbar.success('Área eliminada')
    await loadDepartments()
  } catch (err) {
    error.value =
      (err as { data?: { message?: string } })?.data?.message ??
      'No se pudo eliminar el área.'
  }
}

const positionDialog = ref(false)
const positionForm = ref({
  id: '',
  title: '',
  departmentId: '',
  description: '',
  functionsText: '',
  requirementsText: '',
  minSalary: null as number | null,
  maxSalary: null as number | null,
})
const savingPosition = ref(false)

const openPosition = (position?: IPositionView) => {
  positionForm.value = position
    ? {
        id: position.id,
        title: position.title,
        departmentId: position.departmentId ?? '',
        description: position.description,
        functionsText: position.functions.join('\n'),
        requirementsText: position.requirements.join('\n'),
        minSalary: position.minSalary,
        maxSalary: position.maxSalary,
      }
    : {
        id: '',
        title: '',
        departmentId: '',
        description: '',
        functionsText: '',
        requirementsText: '',
        minSalary: null,
        maxSalary: null,
      }
  positionDialog.value = true
}

const savePosition = async () => {
  if (!positionForm.value.title.trim()) return
  savingPosition.value = true
  error.value = ''
  try {
    const body = {
      title: positionForm.value.title.trim(),
      departmentId: positionForm.value.departmentId || null,
      description: positionForm.value.description.trim(),
      functions: positionForm.value.functionsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      requirements: positionForm.value.requirementsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      minSalary: positionForm.value.minSalary,
      maxSalary: positionForm.value.maxSalary,
    }
    const url = positionForm.value.id
      ? API_PATHS.organization.position(positionForm.value.id)
      : API_PATHS.organization.positions
    await authFetch(url, {
      method: positionForm.value.id ? 'PUT' : 'POST',
      body,
    })
    snackbar.success(positionForm.value.id ? 'Cargo actualizado' : 'Cargo creado')
    positionDialog.value = false
    await loadPositions()
  } catch {
    error.value = 'No se pudo guardar el cargo.'
  } finally {
    savingPosition.value = false
  }
}

const deletePosition = async (position: IPositionView) => {
  if (!confirm(`¿Eliminar el cargo "${position.title}"?`)) return
  try {
    await authFetch(API_PATHS.organization.position(position.id), {
      method: 'DELETE',
    })
    snackbar.success('Cargo eliminado')
    await loadPositions()
  } catch {
    error.value = 'No se pudo eliminar el cargo.'
  }
}

// ---- Organigrama (jerarquía empresa → áreas → jefe → empleados) ----
const orgView = ref<'tree' | 'sunburst'>('tree')

const buildOrgHierarchy = () => {
  const root: Record<string, any> = {
    name: 'Suite RH',
    itemStyle: { color: '#0F2440' },
    children: [],
  }
  const areaNodes = new Map<string, Record<string, any>>()
  const noAreaNode: Record<string, any> = {
    name: 'Sin área',
    count: 0,
    itemStyle: { color: '#94A3B8' },
    children: [],
  }
  for (const department of departments.value) {
    const node: Record<string, any> = {
      name: department.managerName
        ? `${department.name}\nJefe: ${department.managerName}`
        : department.name,
      count: 0,
      itemStyle: { color: department.color || '#1867C0' },
      children: [],
    }
    areaNodes.set(department.id, node)
    root.children.push(node)
  }
  root.children.push(noAreaNode)

  const employeeArea = (employee: Record<string, any>): string => {
    const department = employee.department
    return department && typeof department === 'object'
      ? (department._id ?? '')
      : ''
  }
  const departmentManagerIds = new Map<string, string>()
  for (const department of departments.value) {
    if (department.managerId) {
      departmentManagerIds.set(department.id, department.managerId)
    }
  }

  const nodes = new Map<string, Record<string, any>>()
  for (const employee of employeesForChart.value) {
    nodes.set(employee._id, {
      name: `${employee.firstName} ${employee.lastName}`,
      position: employee.position ?? '',
      value: 1,
      itemStyle: { color: '#48A9A6' },
      children: [],
    })
  }

  for (const employee of employeesForChart.value) {
    const node = nodes.get(employee._id)
    if (!node) continue
    const areaId = employeeArea(employee)
    const areaNode = areaNodes.get(areaId) ?? noAreaNode
    // El jefe ya aparece en la etiqueta del área: no se duplica como nodo.
    if (departmentManagerIds.get(areaId) === employee._id) continue
    areaNode.children.push(node)
    areaNode.count = (areaNode.count ?? 0) + 1
  }

  // Total de personas por área: el tamaño del sector del sunburst refleja
  // el tamaño real del equipo (jefe + colaboradores).
  for (const node of root.children) {
    if (node.count) node.value = node.count
  }

  return root
}

const orgChartOptions = computed(() => {
  const root = buildOrgHierarchy()
  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: { data?: Record<string, any> }) => {
        const data = params.data ?? {}
        return data.position
          ? `${data.name}<br/><span style="font-size:12px">${data.position}</span>`
          : data.name
      },
    },
    series: [
      {
        type: 'tree',
        data: [root],
        orient: 'TB',
        top: 8,
        left: 24,
        right: 24,
        bottom: 8,
        symbol: 'circle',
        symbolSize: 7,
        roam: true,
        expandAndCollapse: true,
        initialTreeDepth: 4,
        nodeGap: 20,
        label: {
          position: 'bottom',
          distance: 2,
          fontSize: 10,
          color: '#334155',
          width: 120,
          lineHeight: 12,
          formatter: (params: { data?: Record<string, any> }) => {
            const data = params.data ?? {}
            if (!data.position) return data.name
            let name = String(data.name ?? '')
            const parts = name.split(' ').filter(Boolean)
            if (parts.length >= 2) {
              return `${parts[0]}\n${parts.slice(1).join(' ')}`
            }
            return data.name
          },
        },
        labelLayout: { hideOverlap: true },
        lineStyle: { color: '#CBD5E1', width: 1.5 },
        emphasis: { focus: 'descendant' },
      },
    ],
  }
})

const orgSunburstOptions = computed(() => {
  const lightenColor = (hex: string, amount: number): string => {
    const clean = hex.replace('#', '')
    const num = parseInt(clean, 16)
    const channel = (shift: number) =>
      Math.min(
        255,
        Math.round(
          ((num >> shift) & 255) + (255 - ((num >> shift) & 255)) * amount,
        ),
      )
    const r = channel(16)
    const g = channel(8)
    const b = channel(0)
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
  }

  // Vista plana: empresa → áreas → empleados (cada persona es un sector).
  const root: Record<string, any> = {
    name: 'Suite RH',
    children: [],
  }
  const areaNodes = new Map<string, Record<string, any>>()
  const areaColorById = new Map<string, string>()
  const areaManagerById = new Map<string, string>()
  for (const department of departments.value) {
    const node: Record<string, any> = {
      name: department.name,
      itemStyle: { color: department.color || '#1867C0' },
      children: [],
    }
    areaNodes.set(department.id, node)
    areaColorById.set(department.id, department.color || '#1867C0')
    if (department.managerId) {
      areaManagerById.set(department.id, department.managerId)
    }
    root.children.push(node)
  }
  const noAreaNode: Record<string, any> = {
    name: 'Sin área',
    itemStyle: { color: '#94A3B8' },
    children: [],
  }
  root.children.push(noAreaNode)
  areaColorById.set('', '#94A3B8')

  const employeeArea = (employee: Record<string, any>): string => {
    const department = employee.department
    return department && typeof department === 'object'
      ? (department._id ?? '')
      : ''
  }

  for (const employee of employeesForChart.value) {
    const areaId = employeeArea(employee)
    const areaNode = areaNodes.get(areaId) ?? noAreaNode
    const baseColor = areaColorById.get(areaId) ?? '#94A3B8'
    const isJefe = areaManagerById.get(areaId) === employee._id
    areaNode.children.push({
      name: `${isJefe ? '★ ' : ''}${employee.firstName} ${employee.lastName}`,
      position: employee.position ?? '',
      value: 1,
      itemStyle: {
        color: isJefe ? baseColor : lightenColor(baseColor, 0.6),
        borderColor: '#FFFFFF',
        borderWidth: isJefe ? 2 : 1.5,
      },
    })
  }
  for (const node of root.children) {
    if (node.children.length) node.value = node.children.length
  }

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: {
        data?: Record<string, any>
        treePathInfo?: Array<Record<string, any>>
      }) => {
        const data = params.data ?? {}
        const depth = (params.treePathInfo ?? []).length
        if (depth === 2 && typeof data.value === 'number') {
          return `${data.name} · ${data.value} persona${data.value === 1 ? '' : 's'}`
        }
        return data.position
          ? `${data.name}<br/><span style="font-size:12px">${data.position}</span>`
          : data.name
      },
    },
    series: [
      {
        type: 'sunburst',
        data: [root],
        radius: [0, '94%'],
        center: ['50%', '52%'],
        label: {
          rotate: 'radial',
          minAngle: 14,
          fontSize: 10,
          color: '#1E293B',
          formatter: (params: {
            data?: Record<string, any>
            treePathInfo?: Array<Record<string, any>>
          }) => {
            const data = params.data ?? {}
            const depth = (params.treePathInfo ?? []).length
            if (depth === 2 && typeof data.value === 'number') {
              return `${data.name}\n${data.value} persona${data.value === 1 ? '' : 's'}`
            }
            let name = String(data.name ?? '')
            const isJefe = name.startsWith('★ ')
            if (isJefe) name = name.slice(2)
            const parts = name.split(' ').filter(Boolean)
            if (parts.length >= 2) {
              return `${isJefe ? '★ ' : ''}${parts[0]}\n${parts.slice(1).join(' ')}`
            }
            return data.name
          },
        },
        labelLayout: { hideOverlap: true },
        itemStyle: {
          borderColor: '#FFFFFF',
          borderWidth: 2,
          borderRadius: 4,
        },
        emphasis: { focus: 'ancestor' },
      },
    ],
  }
})
</script>

<template>
  <div>
    <CommonPageHeader
      title="Organización"
      subtitle="Áreas y cargos de la empresa con sus funciones"
    />

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

    <v-tabs v-model="tab" density="comfortable" class="mb-4">
      <v-tab value="departments" prepend-icon="mdi-office-building-outline">
        Áreas
      </v-tab>
      <v-tab value="positions" prepend-icon="mdi-badge-account-outline">
        Cargos
      </v-tab>
      <v-tab value="orgchart" prepend-icon="mdi-sitemap-outline">
        Organigrama
      </v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <!-- Áreas -->
      <v-window-item value="departments">
        <CommonListToolbar hide-search :loading="loading">
          <template #actions>
            <v-btn
              color="primary"
              variant="tonal"
              prepend-icon="mdi-plus"
              @click="openDepartment()"
            >
              Nueva área
            </v-btn>
          </template>
        </CommonListToolbar>
        <v-data-table
          :headers="[
            { title: 'Nombre', key: 'name' },
            { title: 'Código', key: 'code' },
            { title: 'Responsable', key: 'managerName' },
            { title: 'Descripción', key: 'description' },
            { title: '', key: 'actions', sortable: false },
          ]"
          :items="departments"
          :loading="loading"
          density="compact"
        >
          <template #[`item.name`]="{ item }">
            <span
              class="d-inline-block mr-2"
              style="width: 12px; height: 12px; border-radius: 50%; vertical-align: middle"
              :style="{ background: item.color || '#1867C0' }"
            ></span>
            {{ item.name }}
          </template>
          <template #[`item.managerName`]="{ item }">
            <v-chip
              v-if="!item.managerName"
              size="x-small"
              color="warning"
              variant="tonal"
              prepend-icon="mdi-alert-outline"
            >
              Sin jefe
            </v-chip>
            <span v-else>{{ item.managerName }}</span>
          </template>
          <template #[`item.actions`]="{ item }">
            <v-btn icon="mdi-pencil" size="small" variant="text" @click="openDepartment(item)" />
            <v-btn
              icon="mdi-delete"
              size="small"
              variant="text"
              color="error"
              @click="deleteDepartment(item)"
            />
          </template>
          <template #no-data>No hay áreas creadas.</template>
        </v-data-table>
      </v-window-item>

      <!-- Cargos -->
      <v-window-item value="positions">
        <CommonListToolbar hide-search :loading="loading">
          <template #actions>
            <v-btn
              color="primary"
              variant="tonal"
              prepend-icon="mdi-plus"
              @click="openPosition()"
            >
              Nuevo cargo
            </v-btn>
          </template>
        </CommonListToolbar>
        <v-data-table
          :headers="[
            { title: 'Cargo', key: 'title' },
            { title: 'Área', key: 'department' },
            { title: 'Funciones', key: 'functionsCount' },
            { title: '', key: 'actions', sortable: false },
          ]"
          :items="positions"
          :loading="loading"
          density="compact"
        >
          <template #[`item.functionsCount`]="{ item }">
            {{ item.functions.length }}
          </template>
          <template #[`item.actions`]="{ item }">
            <v-btn icon="mdi-pencil" size="small" variant="text" @click="openPosition(item)" />
            <v-btn
              icon="mdi-delete"
              size="small"
              variant="text"
              color="error"
              @click="deletePosition(item)"
            />
          </template>
          <template #no-data>No hay cargos creados.</template>
        </v-data-table>
      </v-window-item>

      <!-- Organigrama -->
      <v-window-item value="orgchart">
        <v-card elevation="0" rounded="xl" style="border: 1px solid rgba(15,23,42,0.08)">
          <div class="d-flex justify-end pa-4 pb-0">
            <v-btn-toggle
              v-model="orgView"
              density="comfortable"
              variant="outlined"
              divided
              color="primary"
            >
              <v-btn value="tree" prepend-icon="mdi-sitemap">Árbol</v-btn>
              <v-btn value="sunburst" prepend-icon="mdi-chart-donut">Sunburst</v-btn>
            </v-btn-toggle>
          </div>
          <v-card-text>
            <VChart
              :option="orgView === 'tree' ? orgChartOptions : orgSunburstOptions"
              autoresize
              style="height: 540px; width: 100%"
            />
            <p class="text-caption text-medium-emphasis text-center mb-0 mt-2">
              ★ = jefe de área · La jerarquía se arma según el área y el jefe directo de cada empleado.
            </p>
          </v-card-text>
        </v-card>
      </v-window-item>
    </v-window>

    <!-- Diálogo área -->
    <v-dialog v-model="departmentDialog" max-width="520" persistent>
      <v-card>
        <v-card-title class="text-subtitle-1 font-weight-bold">
          {{ departmentForm.id ? 'Editar área' : 'Nueva área' }}
        </v-card-title>
        <v-divider />
        <v-card-text class="pt-4">
          <v-text-field
            v-model="departmentForm.name"
            label="Nombre del área *"
            class="mb-3"
          />
          <v-text-field v-model="departmentForm.code" label="Código" class="mb-3" />
          <v-row class="mb-3" align="center">
            <v-col cols="5">
              <span class="text-body-2">Color del área</span>
            </v-col>
            <v-col cols="7">
              <div class="d-flex align-center ga-1">
                <v-menu v-model="colorMenu" :close-on-content-click="false" offset-y>
                  <template #activator="{ props }">
                    <v-btn v-bind="props" variant="tonal" class="text-none">
                      <span
                        class="mr-2"
                        style="width: 18px; height: 18px; border-radius: 6px; display: inline-block"
                        :style="{ background: departmentForm.color }"
                      ></span>
                      {{ departmentForm.color }}
                    </v-btn>
                  </template>
                  <v-color-picker
                    v-model="departmentForm.color"
                    hide-inputs
                    mode="hex"
                  />
                </v-menu>
                <v-btn
                  icon="mdi-dice-5-outline"
                  size="small"
                  variant="text"
                  title="Sugerir otro color"
                  @click="suggestAnotherColor"
                />
              </div>
            </v-col>
          </v-row>
          <v-autocomplete
            v-model="departmentForm.manager"
            :items="employeeOptions"
            label="Responsable del área (jefe)"
            clearable
            class="mb-3"
          />
          <v-textarea
            v-model="departmentForm.description"
            label="Descripción"
            rows="3"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="departmentDialog = false">Cancelar</v-btn>
          <v-btn
            color="primary"
            variant="tonal"
            :loading="savingDepartment"
            @click="saveDepartment"
          >
            Guardar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo cargo -->
    <v-dialog v-model="positionDialog" max-width="620" persistent>
      <v-card>
        <v-card-title class="text-subtitle-1 font-weight-bold">
          {{ positionForm.id ? 'Editar cargo' : 'Nuevo cargo' }}
        </v-card-title>
        <v-divider />
        <v-card-text class="pt-4">
          <v-text-field v-model="positionForm.title" label="Título del cargo *" class="mb-3" />
          <v-select
            v-model="positionForm.departmentId"
            :items="departments.map((department) => ({ title: department.name, value: department.id }))"
            label="Área"
            clearable
            class="mb-3"
          />
          <v-textarea
            v-model="positionForm.description"
            label="Descripción"
            rows="2"
            class="mb-3"
          />
          <v-textarea
            v-model="positionForm.functionsText"
            label="Funciones (una por línea)"
            rows="4"
            class="mb-3"
          />
          <v-textarea
            v-model="positionForm.requirementsText"
            label="Requisitos (uno por línea)"
            rows="3"
            class="mb-3"
          />
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model.number="positionForm.minSalary"
                label="Salario mínimo ($)"
                type="number"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model.number="positionForm.maxSalary"
                label="Salario máximo ($)"
                type="number"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="positionDialog = false">Cancelar</v-btn>
          <v-btn
            color="primary"
            variant="tonal"
            :loading="savingPosition"
            @click="savePosition"
          >
            Guardar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
