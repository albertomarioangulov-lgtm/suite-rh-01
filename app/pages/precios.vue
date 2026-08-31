<script setup lang="ts">
definePageMeta({
  layout: 'landing',
})

useHead({
  title: 'Precios — Suite RH',
  meta: [
    {
      name: 'description',
      content:
        'Planes de Suite RH por suscripción mensual y costo por empleado. Con nómina, sin nómina o todo incluido.',
    },
  ],
})

const plans = [
  {
    name: 'Básico',
    description: 'Gestión de personas sin nómina',
    base: '$120.000',
    perEmployee: '$8.000',
    implementation: '$500.000',
    highlighted: false,
    features: [
      'Empleados, turnos y asistencia',
      'Ausencias y permisos',
      'Reportes básicos',
      'Hasta 10 empleados incluidos',
      'Centro de ayuda integrado',
      'Soporte por correo',
    ],
  },
  {
    name: 'Profesional',
    description: 'Con nómina — la opción más completa',
    base: '$200.000',
    perEmployee: '$12.000',
    implementation: '$800.000',
    highlighted: true,
    features: [
      'Todo lo del plan Básico',
      'Liquidación de nómina y seguridad social',
      'Préstamos y descuentos',
      'Dashboard con KPIs y alertas',
      'Parámetros legales actualizables',
      'Soporte prioritario',
    ],
  },
  {
    name: 'Personalizado',
    description: 'Operaciones complejas o varias empresas',
    base: 'A medida',
    perEmployee: '',
    implementation: '',
    custom: true,
    highlighted: false,
    features: [
      'Todo lo del plan Profesional',
      'Varias empresas desde una sola cuenta',
      'Contratos e historial de vinculación',
      'Integraciones y nómina electrónica',
      'Soporte y acompañamiento dedicado',
    ],
  },
]

const addons = [
  {
    title: 'Nómina electrónica XML',
    description: 'Generación y envío de la nómina electrónica ante la DIAN.',
    price: '+$50.000/mes',
    implementation: '+$400.000 implementación',
  },
  {
    title: 'Portal de autoservicio',
    description: 'El empleado consulta su información, desprendibles y novedades.',
    price: '+$30.000/mes',
    implementation: 'Incluido en la implementación',
  },
]

const pricingFaq = [
  {
    q: '¿Qué incluye el costo por empleado?',
    a: 'El costo por empleado cubre la administración del sistema para cada colaborador activo: ficha, asistencia, ausencias y su participación en la nómina cuando aplique.',
  },
  {
    q: '¿Hay descuentos?',
    a: 'Sí: 10% por pago anual, 15% para empresas con más de 100 empleados y descuentos combinados hasta 25%.',
  },
  {
    q: '¿Puedo cambiar de plan después?',
    a: 'Sí. Puedes migrar de plan en cualquier momento y el ajuste se prorratea en la siguiente factura.',
  },
  {
    q: '¿La implementación incluye configuración?',
    a: 'Incluye la configuración de parámetros legales, carga de empleados, turnos y capacitación del equipo. El tiempo típico es de 3 a 5 días hábiles.',
  },
]
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="py-14 text-center text-white" style="background: linear-gradient(160deg, #0B1B33 0%, #0F2440 55%, #1E3A5F 100%)">
      <v-container>
        <div class="text-caption text-uppercase font-weight-bold mb-2" style="color: #7DD3FC; letter-spacing: 0.08em">
          Precios
        </div>
        <h1 class="text-h4 font-weight-bold mb-3">Planes simples y escalables</h1>
        <p class="text-subtitle-1 mx-auto mb-0" style="max-width: 620px; color: rgba(255,255,255,0.75)">
          Suscripción mensual + costo por empleado activo. Sin permanencias, sin sorpresas.
        </p>
      </v-container>
    </section>

    <!-- Planes -->
    <section class="py-14" style="background: linear-gradient(180deg, #F8FAFC, #F1F5F9)">
      <v-container>
        <v-row justify="center" align="stretch">
          <v-col v-for="plan in plans" :key="plan.name" cols="12" md="6" lg="4" class="d-flex">
            <v-card
              class="w-100 pa-6 d-flex flex-column"
              rounded="xl"
              :class="{ 'plan-highlight': plan.highlighted }"
              :elevation="plan.highlighted ? 12 : 0"
              :style="plan.highlighted ? 'border: 2px solid #3B82F6' : 'border: 1px solid rgba(15,23,42,0.08)'"
            >
              <v-chip
                v-if="plan.highlighted"
                color="primary"
                size="small"
                class="align-self-start mb-3"
                label
              >
                Más popular
              </v-chip>
              <div class="text-subtitle-1 font-weight-bold">{{ plan.name }}</div>
              <p class="text-body-2 text-medium-emphasis mb-4">{{ plan.description }}</p>
              <div class="d-flex align-baseline ga-1 mb-1">
                <span class="text-h5 font-weight-bold">{{ plan.base }}</span>
                <span v-if="!plan.custom" class="text-caption text-medium-emphasis">/mes</span>
              </div>
              <div v-if="!plan.custom" class="text-body-2 text-medium-emphasis mb-2">
                + {{ plan.perEmployee }} por empleado activo
              </div>
              <div v-if="!plan.custom" class="text-caption text-medium-emphasis mb-4">
                Implementación única: {{ plan.implementation }}
              </div>
              <div v-else class="text-body-2 text-medium-emphasis mb-4">
                Te enviamos una propuesta según tu alcance.
              </div>
              <v-divider class="mb-4" />
              <div class="flex-grow-1">
                <div
                  v-for="feature in plan.features"
                  :key="feature"
                  class="d-flex align-start mb-2"
                >
                  <v-icon size="18" color="success" class="mr-2">mdi-check-circle-outline</v-icon>
                  <span class="text-body-2">{{ feature }}</span>
                </div>
              </div>
              <v-btn
                to="/contacto"
                class="mt-6"
                color="primary"
                :variant="plan.highlighted ? 'flat' : 'outlined'"
                size="large"
                :prepend-icon="plan.custom ? 'mdi-phone-outline' : 'mdi-email-outline'"
              >
                {{ plan.custom ? 'Contáctanos' : 'Solicitar propuesta' }}
              </v-btn>
            </v-card>
          </v-col>
        </v-row>

        <p class="text-caption text-medium-emphasis text-center mt-6 mb-0">
          Precios de referencia, sujetos a IVA y a validación según el alcance y el tamaño de la empresa.
        </p>
      </v-container>
    </section>

    <!-- Add-ons -->
    <section class="py-14" style="background: #FFFFFF">
      <v-container>
        <div class="section-tag">Add-ons</div>
        <h2 class="text-h5 text-center font-weight-bold mb-2">Funcionalidades adicionales</h2>
        <p class="text-subtitle-1 text-medium-emphasis text-center mb-10" style="max-width: 560px; margin-left: auto; margin-right: auto">
          Actívalas cuando las necesites, sin cambiar de plan.
        </p>
        <v-row justify="center">
          <v-col v-for="addon in addons" :key="addon.title" cols="12" md="6" lg="5">
            <v-card class="pa-6 h-100" rounded="xl" elevation="0" style="border: 1px solid rgba(15,23,42,0.08)">
              <div class="text-subtitle-1 font-weight-bold mb-1">{{ addon.title }}</div>
              <p class="text-body-2 text-medium-emphasis mb-3">{{ addon.description }}</p>
              <div class="text-body-2 font-weight-bold" style="color: #1867C0">{{ addon.price }}</div>
              <div class="text-caption text-medium-emphasis">{{ addon.implementation }}</div>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- FAQ de precios -->
    <section class="py-14" style="background: linear-gradient(180deg, #F1F5F9, #F8FAFC)">
      <v-container>
        <div class="section-tag">Preguntas</div>
        <h2 class="text-h5 text-center font-weight-bold mb-10">Dudas frecuentes sobre precios</h2>
        <v-expansion-panels variant="accordion" class="mx-auto" style="max-width: 760px">
          <v-expansion-panel v-for="item in pricingFaq" :key="item.q">
            <v-expansion-panel-title class="text-body-1 font-weight-medium">
              {{ item.q }}
            </v-expansion-panel-title>
            <v-expansion-panel-text class="text-body-2 text-medium-emphasis">
              {{ item.a }}
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-container>
    </section>

    <!-- CTA -->
    <section class="py-14 text-center" style="background: #0F2440">
      <v-container>
        <h2 class="text-h5 text-white font-weight-bold mb-3">¿Listo para cotizar tu plan?</h2>
        <p class="text-body-1 mb-6" style="color: rgba(255,255,255,0.7)">
          Cuéntanos cuántos empleados tienes y te enviamos una propuesta a medida.
        </p>
        <v-btn to="/contacto" color="orange-darken-1" variant="flat" size="large" prepend-icon="mdi-email-outline">
          Solicitar propuesta
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
</style>
