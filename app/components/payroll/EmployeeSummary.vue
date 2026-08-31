<script setup lang="ts">
import { formatCOP } from '~/utils/number-helpers'
import type { IPayrollEntry } from '~/composables/states/usePayrollState'

const props = defineProps<{
  entry: IPayrollEntry
}>()

const detailsOpen = ref(false)

const employeeName = (employee: IPayrollEntry['employee']) => {
  if (typeof employee === 'object' && employee) {
    return `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim()
  }
  return 'Empleado'
}
</script>

<template>
  <v-card>
    <v-card-item>
      <v-card-title class="text-subtitle-1 font-weight-bold">
        {{ employeeName(entry.employee) }}
      </v-card-title>
      <v-card-subtitle>
        {{ entry.devengados.daysWorked }} día(s)
      </v-card-subtitle>
    </v-card-item>
    <v-divider />
    <v-list density="compact">
      <v-list-item
        title="Devengado"
        :subtitle="formatCOP(entry.devengados.total)"
      />
      <v-list-item
        title="Deducido"
        :subtitle="formatCOP(entry.deducciones.total)"
      />
      <v-list-item title="Neto a pagar" :subtitle="formatCOP(entry.totalToPay)" />
    </v-list>
    <v-divider />
    <v-btn
      block
      variant="text"
      size="small"
      class="text-caption text-medium-emphasis"
      @click="detailsOpen = !detailsOpen"
    >
      <v-icon
        :icon="detailsOpen ? 'mdi-chevron-up' : 'mdi-chevron-down'"
        size="small"
        class="me-1"
      />
      {{ detailsOpen ? 'Ocultar desglose' : 'Ver desglose' }}
    </v-btn>
    <v-expand-transition>
      <div v-if="detailsOpen">
        <v-divider />
        <PayrollEmployeeBreakdown :entry="props.entry" />
      </div>
    </v-expand-transition>
  </v-card>
</template>
