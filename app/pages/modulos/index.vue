<script setup lang="ts">
import { modules } from '~/data/modules'

definePageMeta({
  layout: 'landing',
})

useHead({
  title: 'Módulos — Suite RH',
  meta: [
    {
      name: 'description',
      content:
        'Conoce los módulos de Suite RH: empleados, turnos, asistencia, ausencias, nómina, préstamos, reportes, contratos y control por roles.',
    },
  ],
})
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="py-16 text-center text-white" style="background: linear-gradient(160deg, #0B1B33 0%, #0F2440 55%, #1E3A5F 100%)">
      <v-container>
        <div class="text-caption text-uppercase font-weight-bold mb-2" style="color: #7DD3FC; letter-spacing: 0.08em">
          Suite RH
        </div>
        <h1 class="text-h3 font-weight-bold mb-3">Módulos del sistema</h1>
        <p class="text-subtitle-1 mx-auto mb-0" style="max-width: 640px; color: rgba(255,255,255,0.75)">
          Todo el ciclo de gestión humana desde un solo lugar: expediente digital, turnos, asistencia,
          nómina y analítica, con parámetros legales colombianos.
        </p>
      </v-container>
    </section>

    <!-- Grid de módulos -->
    <section class="py-16" style="background: linear-gradient(180deg, #F1F5F9, #F8FAFC)">
      <v-container>
        <v-row>
          <v-col
            v-for="module in modules"
            :key="module.slug"
            cols="12"
            sm="6"
            lg="3"
          >
            <v-card
              class="h-100 module-card"
              variant="text"
              rounded="xl"
              :to="`/modulos/${module.slug}`"
            >
              <v-card-text class="pa-6">
                <v-avatar :color="`${module.color}1A`" size="56" class="mb-4">
                  <v-icon :color="module.color" size="28">{{ module.icon }}</v-icon>
                </v-avatar>
                <div class="text-subtitle-1 font-weight-bold mb-2">{{ module.title }}</div>
                <p class="text-body-2 text-medium-emphasis mb-4">{{ module.summary }}</p>
                <span class="text-body-2 font-weight-medium" :style="{ color: module.color }">
                  Conocer más
                  <v-icon size="16" class="mb-0">mdi-arrow-right</v-icon>
                </span>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- CTA -->
    <section class="py-14 text-center" style="background: #0F2440">
      <v-container>
        <h2 class="text-h5 text-white font-weight-bold mb-3">¿Listo para verlo en acción?</h2>
        <p class="text-body-1 mb-6" style="color: rgba(255,255,255,0.7)">
          Solicita una demo con tus propios datos o crea tu cuenta de prueba.
        </p>
        <v-btn
          to="/auth/login"
          color="orange-darken-1"
          variant="flat"
          size="large"
          prepend-icon="mdi-login"
          class="mr-3"
        >
          Iniciar sesión
        </v-btn>
        <v-btn
          to="/contacto"
          variant="outlined"
          color="white"
          size="large"
          prepend-icon="mdi-email-outline"
        >
          Contáctanos
        </v-btn>
      </v-container>
    </section>
  </div>
</template>

<style scoped>
.module-card {
  background: #FFFFFF;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.module-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);
}
</style>
