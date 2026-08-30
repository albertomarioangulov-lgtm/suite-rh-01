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

const sections = computed(() => {
  const dev = props.entry.devengados
  const ded = props.entry.deducciones
  const ss = props.entry.seguridadSocial
  return [
    {
      title: 'Devengado',
      lines: [
        { label: `Salario base (${dev.daysWorked} día(s))`, value: dev.baseSalary },
        ...(dev.paidAbsenceDays
          ? [
              {
                label: `Ausencias remuneradas (${dev.paidAbsenceDays} día(s))`,
                value: 0,
              },
            ]
          : []),
        ...(dev.absenceCompanyPaidValue
          ? [
              {
                label: 'Incapacidad común (pago empresa)',
                value: dev.absenceCompanyPaidValue,
              },
            ]
          : []),
        ...(dev.absenceEpsValue
          ? [
              {
                label: 'Incapacidad común (cubre EPS)',
                value: dev.absenceEpsValue,
              },
            ]
          : []),
        ...(dev.absenceArlValue
          ? [
              {
                label: 'Incapacidad laboral (cubre ARL)',
                value: dev.absenceArlValue,
              },
            ]
          : []),
        { label: 'Auxilio de transporte', value: dev.transportAllowance },
        { label: 'Horas extra diurnas (25%)', value: dev.overtimeDay },
        { label: 'Horas extra nocturnas (75%)', value: dev.overtimeNight },
        { label: 'Recargo nocturno (35%)', value: dev.nightSurcharge },
        { label: 'Bonificaciones', value: dev.bonuses },
        { label: 'Comisiones', value: dev.commissions },
      ],
      total: dev.total,
    },
    {
      title: 'Deducido',
      lines: [
        { label: 'Salud empleado (4%)', value: ded.employeeHealth },
        { label: 'Pensión empleado (4%)', value: ded.employeePension },
        { label: 'Retención en la fuente', value: ded.sourceRetention },
        { label: 'Embargos', value: ded.garnishments },
        { label: 'Préstamos', value: ded.loans },
      ],
      total: ded.total,
    },
    {
      title: 'Seguridad social (empleador)',
      lines: [
        { label: 'Salud empleador (8,5%)', value: ss.employerHealth },
        { label: 'Pensión empleador (12%)', value: ss.employerPension },
        { label: 'ARL', value: ss.arl },
        { label: 'SENA (2%)', value: ss.sena },
        { label: 'ICBF (3%)', value: ss.icbf },
        { label: 'Caja de compensación (4%)', value: ss.compensationFund },
      ],
      total: ss.total,
    },
  ]
})
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
        <v-list density="compact">
          <template v-for="section in sections" :key="section.title">
            <v-list-subheader class="font-weight-medium text-primary">
              {{ section.title }}
            </v-list-subheader>
            <v-list-item
              v-for="line in section.lines"
              :key="line.label"
              :title="line.label"
              density="compact"
            >
              <template #append>
                <span class="text-body-2">{{ formatCOP(line.value) }}</span>
              </template>
            </v-list-item>
            <v-list-item class="font-weight-medium">
              <template #title>
                Total {{ section.title }}
              </template>
              <template #append>
                <span class="text-body-2 font-weight-medium">
                  {{ formatCOP(section.total) }}
                </span>
              </template>
            </v-list-item>
            <v-divider v-if="section !== sections[sections.length - 1]" />
          </template>
        </v-list>
      </div>
    </v-expand-transition>
  </v-card>
</template>
