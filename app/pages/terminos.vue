<script setup lang="ts">
definePageMeta({
  layout: 'landing',
})

useHead({
  title: 'Términos y condiciones — Suite RH',
  meta: [
    {
      name: 'description',
      content:
        'Términos y condiciones de uso del sistema Suite RH: servicio, cuentas, responsabilidades y legislación aplicable.',
    },
  ],
})

const sections = [
  {
    title: '1. Aceptación de los términos',
    paragraphs: [
      'Al utilizar Suite RH, el cliente acepta estos términos y condiciones. Si no está de acuerdo, no debe utilizar el servicio.',
    ],
  },
  {
    title: '2. Descripción del servicio',
    paragraphs: [
      'Suite RH es una plataforma de gestión de recursos humanos que permite administrar empleados, turnos, asistencia, ausencias, nómina, préstamos y reportes, según el plan contratado.',
    ],
  },
  {
    title: '3. Cuentas y responsabilidad del usuario',
    paragraphs: [
      'El cliente es responsable de la confidencialidad de sus credenciales y de las actividades realizadas con su cuenta. El administrador de cada empresa controla los usuarios y permisos.',
    ],
  },
  {
    title: '4. Información y cálculos',
    paragraphs: [
      'El sistema automatiza cálculos con base en los parámetros legales configurados y la información registrada por el cliente. El cliente es responsable de la veracidad de la información ingresada y de validar los resultados antes de su uso oficial.',
    ],
  },
  {
    title: '5. Propiedad intelectual',
    paragraphs: [
      'El software, su diseño, contenido y documentación son propiedad de Suite RH o de sus licenciantes. El cliente obtiene una licencia de uso del servicio, no la propiedad del software.',
    ],
  },
  {
    title: '6. Disponibilidad y soporte',
    paragraphs: [
      'El servicio se presta con la disponibilidad técnica razonable. El soporte se brinda según el plan contratado y a través de los canales habilitados.',
    ],
  },
  {
    title: '7. Limitación de responsabilidad',
    paragraphs: [
      'Suite RH no será responsable por daños indirectos derivados del uso del servicio, ni por decisiones tomadas con base en información incorrecta ingresada por el cliente.',
    ],
  },
  {
    title: '8. Modificaciones',
    paragraphs: [
      'Estos términos pueden actualizarse. Los cambios se publicarán en esta página y entrarán en vigor en la fecha indicada.',
    ],
  },
  {
    title: '9. Legislación aplicable',
    paragraphs: [
      'Estos términos se rigen por las leyes de la República de Colombia. Cualquier controversia se someterá a los jueces competentes de la ciudad de Bogotá D.C.',
    ],
  },
]
</script>

<template>
  <div>
    <section class="py-12 text-white" style="background: linear-gradient(160deg, #0B1B33 0%, #0F2440 55%, #1E3A5F 100%)">
      <v-container>
        <div class="text-caption text-uppercase font-weight-bold mb-2" style="color: #7DD3FC; letter-spacing: 0.08em">
          Legal
        </div>
        <h1 class="text-h4 font-weight-bold mb-2">Términos y condiciones</h1>
        <p class="text-caption mb-0" style="color: rgba(255,255,255,0.6)">
          Última actualización: agosto de 2026
        </p>
      </v-container>
    </section>

    <section class="py-14" style="background: #F8FAFC">
      <v-container style="max-width: 820px">
        <v-card class="pa-8" rounded="xl" elevation="0" style="border: 1px solid rgba(15,23,42,0.08)">
          <div v-for="section in sections" :key="section.title" class="mb-8">
            <h2 class="text-subtitle-1 font-weight-bold mb-3">{{ section.title }}</h2>
            <p v-for="(paragraph, index) in section.paragraphs" :key="index" class="text-body-2 text-medium-emphasis mb-3">
              {{ paragraph }}
            </p>
          </div>
        </v-card>
      </v-container>
    </section>
  </div>
</template>
