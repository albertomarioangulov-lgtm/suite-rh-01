<script setup lang="ts">
definePageMeta({
  layout: 'landing',
})

useHead({
  title: 'Política de privacidad — Suite RH',
  meta: [
    {
      name: 'description',
      content:
        'Política de privacidad y tratamiento de datos personales de Suite RH, conforme a la Ley 1581 de 2012.',
    },
  ],
})

const sections = [
  {
    title: '1. Responsable del tratamiento',
    paragraphs: [
      'Suite RH actúa como responsable del tratamiento de los datos personales recolectados a través de sus plataformas, incluida la información suministrada por clientes y usuarios del sistema.',
      'Para cualquier solicitud relacionada con tus datos personales puedes escribirnos a hola@suite-rh.com.',
    ],
  },
  {
    title: '2. Datos que tratamos y finalidad',
    paragraphs: [
      'Tratamos los datos necesarios para la operación del servicio: información de identificación y contacto de usuarios y empleados, datos laborales (cargo, salario, turnos), registros de asistencia, ausencias y novedades de nómina.',
      'Estos datos se utilizan exclusivamente para la prestación del servicio contratado: administración de personal, liquidación de nómina, generación de reportes y cumplimiento de obligaciones legales.',
    ],
  },
  {
    title: '3. Derechos de los titulares',
    paragraphs: [
      'Conforme a la Ley 1581 de 2012, el titular tiene derecho a conocer, actualizar y rectificar sus datos personales; solicitar prueba de la autorización; ser informado del uso dado a sus datos; y revocar la autorización o solicitar la supresión cuando no se requieran.',
      'Estos derechos pueden ejercerse escribiendo a hola@suite-rh.com; responderemos dentro de los términos legales aplicables.',
    ],
  },
  {
    title: '4. Seguridad y confidencialidad',
    paragraphs: [
      'La información se almacena en infraestructura con respaldos automáticos y acceso restringido por roles. El acceso de cada usuario está limitado a lo necesario para su función.',
      'Los mensajes recibidos a través del formulario de contacto se tratan como texto plano y se utilizan únicamente para atender la solicitud del interesado.',
    ],
  },
  {
    title: '5. Conservación',
    paragraphs: [
      'Los datos se conservan mientras se mantenga la relación contractual o mientras exista una obligación legal de conservación (por ejemplo, documentos laborales y de nómina).',
    ],
  },
  {
    title: '6. Modificaciones',
    paragraphs: [
      'Esta política puede actualizarse para reflejar cambios normativos o del servicio. La versión vigente estará siempre disponible en esta página.',
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
        <h1 class="text-h4 font-weight-bold mb-2">Política de privacidad</h1>
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
          <p class="text-caption text-medium-emphasis mb-0">
            Esta política se rige por la Ley 1581 de 2012 y sus decretos reglamentarios, y por la demás normativa aplicable en Colombia.
          </p>
        </v-card>
      </v-container>
    </section>
  </div>
</template>
