<script setup lang="ts">
definePageMeta({
  layout: 'landing',
})

useHead({
  title: 'Preguntas frecuentes — Suite RH',
  meta: [
    {
      name: 'description',
      content:
        'Respuestas a las dudas más comunes sobre Suite RH: implementación, migración de datos, seguridad, soporte y parámetros legales.',
    },
  ],
})

const faqGroups = [
  {
    title: 'Producto',
    items: [
      {
        q: '¿Qué incluye Suite RH?',
        a: 'Empleados, turnos, asistencia con horas extras, ausencias y permisos, nómina con seguridad social, préstamos, reportes con KPIs, alertas, historial de vinculación y control por roles.',
      },
      {
        q: '¿Puedo usarlo para varias empresas?',
        a: 'Sí. El plan Enterprise permite administrar varias empresas o clientes desde una sola cuenta, con datos completamente aislados entre cada una.',
      },
      {
        q: '¿Los cálculos de nómina se actualizan cuando cambia la ley?',
        a: 'Los porcentajes y valores legales son configurables y versionados por año (SMMLV, recargos, seguridad social, parafiscales), así que se actualizan sin tocar código.',
      },
    ],
  },
  {
    title: 'Implementación',
    items: [
      {
        q: '¿Cuánto tarda la implementación?',
        a: 'Con nómina el tiempo típico es de 3 a 5 días hábiles: configuración de parámetros legales, carga de empleados y capacitación. Sin nómina suele tomar 1 a 2 días.',
      },
      {
        q: '¿Me ayudan a migrar mis datos?',
        a: 'Sí. Incluimos la carga de empleados, turnos e historial básico. Para datos históricos complejos se define un plan de migración al inicio del proyecto.',
      },
      {
        q: '¿Qué necesito para empezar?',
        a: 'La información básica de la empresa, los parámetros legales vigentes y el listado de empleados. Nosotros nos encargamos de la configuración inicial.',
      },
    ],
  },
  {
    title: 'Seguridad y datos',
    items: [
      {
        q: '¿Es seguro almacenar la información de mis empleados?',
        a: 'La información está aislada por empresa (multi-tenant), el acceso se controla por roles y acciones, y se registra auditoría. Los mensajes y datos sensibles se manejan bajo la Ley 1581 de 2012.',
      },
      {
        q: '¿Quién tiene acceso a los datos?',
        a: 'Solo los usuarios autorizados de tu empresa según su rol. El administrador controla la creación de usuarios y permisos.',
      },
      {
        q: '¿Hacen copias de seguridad?',
        a: 'Sí, la base de datos cuenta con respaldos automáticos y restauración para proteger la información de la empresa.',
      },
    ],
  },
  {
    title: 'Soporte',
    items: [
      {
        q: '¿Qué soporte incluye?',
        a: 'El plan Profesional incluye soporte prioritario y el Enterprise acompañamiento dedicado. Todos los planes incluyen el centro de ayuda integrado en el sistema.',
      },
      {
        q: '¿Hay capacitación?',
        a: 'Sí, la implementación incluye capacitación del equipo y guías dentro del sistema para cada módulo.',
      },
    ],
  },
]
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="py-14 text-white" style="background: linear-gradient(160deg, #0B1B33 0%, #0F2440 55%, #1E3A5F 100%)">
      <v-container>
        <div class="text-caption text-uppercase font-weight-bold mb-2" style="color: #7DD3FC; letter-spacing: 0.08em">
          FAQ
        </div>
        <h1 class="text-h4 font-weight-bold mb-3">Preguntas frecuentes</h1>
        <p class="text-subtitle-1 mb-0" style="max-width: 640px; color: rgba(255,255,255,0.75)">
          Las dudas que más nos consultan antes de empezar. ¿Tienes otra? Escríbenos.
        </p>
      </v-container>
    </section>

    <section class="py-14" style="background: linear-gradient(180deg, #F8FAFC, #F1F5F9)">
      <v-container style="max-width: 860px">
        <div v-for="group in faqGroups" :key="group.title" class="mb-10">
          <h2 class="text-h6 font-weight-bold mb-4">{{ group.title }}</h2>
          <v-expansion-panels variant="accordion">
            <v-expansion-panel v-for="item in group.items" :key="item.q">
              <v-expansion-panel-title class="text-body-1 font-weight-medium">
                {{ item.q }}
              </v-expansion-panel-title>
              <v-expansion-panel-text class="text-body-2 text-medium-emphasis">
                {{ item.a }}
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </div>

        <div class="text-center mt-8">
          <p class="text-body-1 text-medium-emphasis mb-4">¿No encontraste tu respuesta?</p>
          <v-btn to="/contacto" color="primary" variant="flat" size="large" prepend-icon="mdi-email-outline">
            Escríbenos
          </v-btn>
        </div>
      </v-container>
    </section>
  </div>
</template>
