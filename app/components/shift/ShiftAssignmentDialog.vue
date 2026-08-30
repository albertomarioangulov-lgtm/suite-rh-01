<script setup lang="ts">
import { API_PATHS } from '~/utils/api-paths'
import { useShiftState } from '~/composables/states/useShiftState'

const props = defineProps<{
  modelValue: boolean
  shiftId?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'changed'): void
}>()

const { authFetch } = useAuthState()
const {
  employeesByShift,
  fetchEmployeesByShift,
  assignShift,
  unassignShift,
} = useShiftState()

const employeeOptions = ref<Array<{ title: string; value: string }>>([])
const selectedIds = ref<string[]>([])
const assigning = ref(false)

const load = async () => {
  if (!props.shiftId) return
  await fetchEmployeesByShift(props.shiftId)
  try {
    const data = await authFetch<{
      items: Array<{ _id: string; firstName: string; lastName: string; document: string }>
    }>(API_PATHS.employees.list, { query: { limit: 100, active: 'true' } })
    employeeOptions.value = data.items.map((employee) => ({
      title: `${employee.firstName} ${employee.lastName} (${employee.document})`,
      value: employee._id,
    }))
  } catch {
    // Error silencioso.
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open && props.shiftId) {
      selectedIds.value = []
      load()
    }
  },
)

const doAssign = async () => {
  if (!props.shiftId || selectedIds.value.length === 0) return
  assigning.value = true
  try {
    await assignShift(props.shiftId, selectedIds.value)
    selectedIds.value = []
    await load()
    emit('changed')
  } finally {
    assigning.value = false
  }
}

const doUnassign = async (employeeId: string) => {
  if (!props.shiftId) return
  await unassignShift(props.shiftId, [employeeId])
  await load()
  emit('changed')
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="640"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center ga-2">
        <v-icon color="primary">mdi-account-multiple-outline</v-icon>
        Asignar empleados al turno
        <v-spacer />
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="emit('update:modelValue', false)"
        />
      </v-card-title>
      <v-divider />
      <v-card-text>
        <v-autocomplete
          v-model="selectedIds"
          :items="employeeOptions"
          label="Empleados para asignar"
          item-title="title"
          item-value="value"
          multiple
          clearable
          class="mb-3"
        />
        <v-btn
          color="primary"
          variant="tonal"
          prepend-icon="mdi-plus"
          :loading="assigning"
          :disabled="selectedIds.length === 0"
          @click="doAssign"
        >
          Asignar ({{ selectedIds.length }})
        </v-btn>

        <h3 class="text-subtitle-2 font-weight-bold mt-4 mb-2">
          Empleados asignados
        </h3>
        <v-list v-if="employeesByShift.length">
          <v-list-item
            v-for="employee in employeesByShift"
            :key="employee._id"
            :title="`${employee.firstName} ${employee.lastName}`"
            :subtitle="employee.document"
          >
            <template #append>
              <v-btn
                icon="mdi-link-off"
                size="small"
                variant="text"
                title="Desasignar"
                @click="doUnassign(employee._id)"
              />
            </template>
          </v-list-item>
        </v-list>
        <v-card-text v-else class="pa-0 text-medium-emphasis">
          Sin empleados asignados.
        </v-card-text>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
