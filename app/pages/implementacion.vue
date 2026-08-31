<script setup lang="ts">
definePageMeta({
  layout: 'landing',
})

useHead({
  title: 'Implementación — Suite RH',
  meta: [
    {
      name: 'description',
      content:
        'Cómo implementamos Suite RH en tu empresa: configuración, carga de datos, prueba y capacitación en 3 a 5 días hábiles.',
    },
  ],
})

const phases = [
  {
    number: '01',
    title: 'Arranque',
    days: 'Día 1',
    text: 'Reunión inicial, definición de alcance, parámetros legales vigentes y acceso a la plataforma.',
  },
  {
    number: '02',
    title: 'Configuración',
    days: 'Día 1–2',
    text: 'Empresa, turnos, tipos de ausencia, préstamos y parámetros de nómina según el plan contratado.',
  },
  {
    number: '03',
    title: 'Carga de datos',
    days: 'Día 2–3',
    text: 'Empleados, salarios, contratos e historial básico. Te entregamos la plantilla y validamos la carga.',
  },
  {
    number: '04',
    title: 'Prueba y validación',
    days: 'Día 3–4',
    text: 'Liquidación de prueba del período, revisión de cálculos y ajustes con tu equipo.',
  },
  {
    number: '05',
    title: 'Capacitación',
    days: 'Día 4–5',
    text: 'Entrenamiento de administradores y usuarios por rol, con guías dentro del sistema.',
  },
  {
    number: '06',
    title: 'Salida y soporte',
    days: 'Continúo',
    text: 'Arranque oficial con acompañamiento y soporte según tu plan.',
  },
]

const included = [
  'Configuración de parámetros legales por año.',
  'Plantilla y carga de empleados.',
  'Capacitación del equipo por rol.',
  'Centro de ayuda integrado.',
  'Soporte según el plan (prioritario / dedicado).',
  'Acompañamiento en el primer cierre de nómina.',
]
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="py-14 text-white" style="background: linear-gradient(160deg, #0B1B33 0%, #0F2440 55%, #1E3A5F 100%)">
      <v-container>
        <div class="text-caption text-uppercase font-weight-bold mb-2" style="color: #7DD3FC; letter-spacing: 0.08em">
          Implementación
        </div>
        <h1 class="text-h4 font-weight-bold mb-3">Operativo en cuestión de días</h1>
        <p class="text-subtitle-1 mb-0" style="max-width: 660px; color: rgba(255,255,255,0.75)">
          Un proceso guiado en 6 fases para que tu equipo quede trabajando con Suite RH sin interrumpir la operación.
        </p>
      </v-container>
    </section>

    <!-- Fases -->
    <section class="py-14" style="background: linear-gradient(180deg, #F8FAFC, #F1F5F9)">
      <v-container>
        <v-row>
          <v-col v-for="phase in phases" :key="phase.number" cols="12" sm="6" lg="4">
            <v-card class="h-100 pa-6" rounded="xl" elevation="0" style="border: 1px solid rgba(15,23,42,0.08)">
              <div class="d-flex align-center justify-space-between mb-3">
                <span class="phase-number">{{ phase.number }}</span>
                <v-chip size="small" color="primary" variant="tonal" label>{{ phase.days }}</v-chip>
              </div>
              <div class="text-subtitle-1 font-weight-bold mb-1">{{ phase.title }}</div>
              <p class="text-body-2 text-medium-emphasis mb-0">{{ phase.text }}</p>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Incluye -->
    <section class="py-14" style="background: #FFFFFF">
      <v-container>
        <div class="section-tag">Incluye</div>
        <h2 class="text-h5 text-center font-weight-bold mb-10">¿Qué incluye la implementación?</h2>
        <v-row justify="center">
          <v-col cols="12" md="8">
            <v-list density="comfortable">
              <v-list-item
                v-for="item in included"
                :key="item"
                prepend-icon="mdi-check-decagram"
                prepend-icon-color="#48A9A6"
                :title="item"
                title-class="text-body-2"
              />
            </v-list>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- CTA -->
    <section class="py-14 text-center" style="background: #0F2440">
      <v-container>
        <h2 class="text-h5 text-white font-weight-bold mb-3">¿Cuándo podemos empezar?</h2>
        <p class="text-body-1 mb-6" style="color: rgba(255,255,255,0.7)">
          Cuéntanos tu caso y te enviamos el plan de implementación con fechas.
        </p>
        <v-btn to="/contacto" color="orange-darken-1" variant="flat" size="large" prepend-icon="mdi-email-outline">
          Solicitar plan
        </v-btn>
      </v-container>
    </section>
  </div>
</template>

<style scoped>
.section-tag {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #3B82F6;
  text-align: center;
  margin-bottom: 8px;
}

.phase-number {
  font-size: 1.8rem;
  font-weight: 900;
  color: rgba(59, 130, 246, 0.14);
  line-height: 1;
}
</style>
