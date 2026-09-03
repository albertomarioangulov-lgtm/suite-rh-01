<script setup lang="ts">
import { API_PATHS } from '~/utils/api-paths'

definePageMeta({ middleware: 'auth' })

interface ISiteDetail {
  id: string
  name: string
  code: string
  city: string
  municipalityCode: string
  address: string
  phone: string
  isMain: boolean
  active: boolean
  sortOrder: number
  employeeCount: number
  activeEmployeeCount: number
}

interface ISiteEmployee {
  id: string
  document: string
  documentType: number
  firstName: string
  lastName: string
  position: string
  department: string
  active: boolean
}

const route = useRoute()
const sedeId = computed(() => String(route.params.id))
const { authFetch } = useAuthState()

const site = ref<ISiteDetail | null>(null)
const employees = ref<ISiteEmployee[]>([])
const loading = ref(true)
const error = ref('')
const search = ref('')

const filteredEmployees = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) return employees.value
  return employees.value.filter((employee) =>
    `${employee.document} ${employee.firstName} ${employee.lastName} ${employee.position}`
      .toLowerCase()
      .includes(query),
  )
})

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const [siteData, employeesData] = await Promise.all([
      authFetch<ISiteDetail>(API_PATHS.organization.site(sedeId.value)),
      authFetch<{ items: ISiteEmployee[] }>(
        API_PATHS.organization.siteEmployees(sedeId.value),
      ),
    ])
    site.value = siteData
    employees.value = employeesData.items ?? []
  } catch {
    error.value = 'No se pudo cargar la sede.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="d-flex align-center ga-2 mb-3">
      <v-btn
        icon="mdi-arrow-left"
        variant="text"
        @click="navigateTo('/admin/organization')"
      />
      <h1 class="text-h6 font-weight-bold mt-0 mb-0">
        {{ site?.name ?? 'Detalle de sede' }}
      </h1>
      <v-chip
        v-if="site?.isMain"
        size="small"
        color="primary"
        variant="tonal"
        prepend-icon="mdi-star"
      >
        Principal
      </v-chip>
      <v-chip
        v-if="site && !site.active"
        size="small"
        color="warning"
        variant="tonal"
      >
        Inactiva
      </v-chip>
    </div>

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

    <v-row v-if="site" class="mb-4">
      <v-col cols="12" md="4">
        <v-card>
          <v-card-item>
            <template #prepend>
              <v-avatar color="primary" variant="tonal" size="42">
                <v-icon>mdi-map-marker-outline</v-icon>
              </v-avatar>
            </template>
            <v-card-title class="text-subtitle-1 font-weight-bold">
              {{ site.name }}
            </v-card-title>
            <v-card-subtitle>{{ site.city || 'Ciudad no definida' }}</v-card-subtitle>
          </v-card-item>
          <v-divider />
          <v-list density="compact">
            <v-list-item
              title="Dirección"
              :subtitle="site.address || '—'"
              prepend-icon="mdi-map-marker-radius-outline"
            />
            <v-list-item
              title="Municipio (DIVIPOLA)"
              :subtitle="site.municipalityCode || '—'"
              prepend-icon="mdi-numeric-5-box-outline"
            />
            <v-list-item
              title="Teléfono"
              :subtitle="site.phone || '—'"
              prepend-icon="mdi-phone-outline"
            />
            <v-list-item
              title="Código"
              :subtitle="site.code || '—'"
              prepend-icon="mdi-tag-outline"
            />
          </v-list>
        </v-card>
      </v-col>

      <v-col cols="12" md="8">
        <v-row>
          <v-col cols="12" sm="6">
            <v-card>
              <v-card-text>
                <div class="text-h5 font-weight-bold">{{ site.employeeCount }}</div>
                <div class="text-body-2 text-medium-emphasis">
                  Empleados en la sede
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" sm="6">
            <v-card>
              <v-card-text>
                <div class="text-h5 font-weight-bold text-success">
                  {{ site.activeEmployeeCount }}
                </div>
                <div class="text-body-2 text-medium-emphasis">Activos</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-card class="mt-4">
          <v-card-text class="pb-0">
            <v-text-field
              v-model="search"
              label="Buscar empleado (documento, nombre, cargo)"
              prepend-inner-icon="mdi-magnify"
              density="compact"
              clearable
              hide-details
            />
          </v-card-text>
          <v-data-table
            :headers="[
              { title: 'Documento', key: 'document' },
              { title: 'Nombre', key: 'name' },
              { title: 'Cargo', key: 'position' },
              { title: 'Área', key: 'department' },
              { title: 'Estado', key: 'active' },
              { title: '', key: 'actions', sortable: false },
            ]"
            :items="filteredEmployees"
            :loading="loading"
            density="compact"
            :items-per-page="10"
          >
            <template #[`item.name`]="{ item }">
              {{ item.firstName }} {{ item.lastName }}
            </template>
            <template #[`item.active`]="{ item }">
              <v-chip
                size="x-small"
                :color="item.active ? 'success' : 'warning'"
                variant="tonal"
              >
                {{ item.active ? 'Activo' : 'Inactivo' }}
              </v-chip>
            </template>
            <template #[`item.actions`]="{ item }">
              <v-btn
                icon="mdi-eye-outline"
                size="small"
                variant="text"
                title="Ver empleado"
                @click="navigateTo(`/admin/employees/${item.id}`)"
              />
            </template>
            <template #no-data>
              {{ search ? 'Sin resultados' : 'Esta sede aún no tiene empleados' }}
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <v-card v-if="loading && !site" max-width="640" class="mx-auto">
      <v-skeleton-loader type="list-item-two-line, divider, table" />
    </v-card>
  </div>
</template>
