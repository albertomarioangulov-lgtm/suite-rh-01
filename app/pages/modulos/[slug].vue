<script setup lang="ts">
import { getModule } from '~/data/modules'

definePageMeta({
  layout: 'landing',
})

const route = useRoute()
const moduleInfo = computed(() => getModule(String(route.params.slug ?? '')))

useHead(() => ({
  title: moduleInfo.value ? `${moduleInfo.value.title} — Suite RH` : 'Módulo no encontrado — Suite RH',
  meta: moduleInfo.value
    ? [
        {
          name: 'description',
          content: moduleInfo.value.summary,
        },
      ]
    : [],
}))
</script>

<template>
  <div>
    <template v-if="moduleInfo">
      <!-- Hero -->
      <section class="py-14 text-white" style="background: linear-gradient(160deg, #0B1B33 0%, #0F2440 55%, #1E3A5F 100%)">
        <v-container>
          <v-btn
            to="/modulos"
            variant="text"
            size="small"
            prepend-icon="mdi-arrow-left"
            class="mb-4 px-0 text-none"
            style="color: rgba(255,255,255,0.7)"
          >
            Todos los módulos
          </v-btn>
          <div class="d-flex align-center ga-4 mb-3">
            <v-avatar :color="`${moduleInfo.color}33`" size="64">
              <v-icon :color="moduleInfo.color" size="34">{{ moduleInfo.icon }}</v-icon>
            </v-avatar>
            <h1 class="text-h4 font-weight-bold mb-0">{{ moduleInfo.title }}</h1>
          </div>
          <p class="text-subtitle-1 mb-0" style="max-width: 680px; color: rgba(255,255,255,0.78)">
            {{ moduleInfo.tagline }}
          </p>
        </v-container>
      </section>

      <!-- Descripción + características -->
      <section class="py-14" style="background: #F8FAFC">
        <v-container>
          <v-row>
            <v-col cols="12" lg="7">
              <div class="section-tag">Descripción</div>
              <h2 class="text-h5 font-weight-bold mb-4">¿Qué hace este módulo?</h2>
              <p
                v-for="(paragraph, index) in moduleInfo.description"
                :key="index"
                class="text-body-1 text-medium-emphasis mb-4"
              >
                {{ paragraph }}
              </p>

              <div class="section-tag mt-8">Características</div>
              <h2 class="text-h5 font-weight-bold mb-4">Funcionalidades incluidas</h2>
              <v-row>
                <v-col v-for="feature in moduleInfo.features" :key="feature" cols="12" sm="6">
                  <div class="d-flex align-start mb-3">
                    <v-icon :color="moduleInfo.color" size="20" class="mr-2">{{ moduleInfo.icon }}</v-icon>
                    <span class="text-body-2">{{ feature }}</span>
                  </div>
                </v-col>
              </v-row>
            </v-col>

            <v-col cols="12" lg="5">
              <!-- Captura -->
              <div v-if="moduleInfo.screenshot" class="shot-frame mb-6">
                <div class="shot-browserbar">
                  <span class="shot-dot"></span>
                  <span class="shot-dot"></span>
                  <span class="shot-dot"></span>
                  <span class="shot-url">app.suite-rh.com</span>
                </div>
                <img :src="moduleInfo.screenshot" :alt="moduleInfo.title" loading="lazy" />
              </div>

              <!-- Base legal -->
              <div class="legal-card pa-6">
                <div class="d-flex align-center ga-2 mb-4">
                  <v-icon color="#48A9A6">mdi-scale-balance</v-icon>
                  <span class="text-subtitle-1 font-weight-bold">Base legal</span>
                </div>
                <div
                  v-for="item in moduleInfo.legal"
                  :key="item.source"
                  class="mb-4"
                >
                  <div class="text-body-2 font-weight-bold mb-1">{{ item.source }}</div>
                  <p class="text-body-2 text-medium-emphasis mb-0">{{ item.text }}</p>
                </div>
              </div>
            </v-col>
          </v-row>
        </v-container>
      </section>

      <!-- CTA -->
      <section class="py-14 text-center" style="background: #0F2440">
        <v-container>
          <h2 class="text-h5 text-white font-weight-bold mb-3">
            Empieza a usar {{ moduleInfo.title.toLowerCase() }}
          </h2>
          <p class="text-body-1 mb-6" style="color: rgba(255,255,255,0.7)">
            Solicita una demo o inicia sesión para verlo con tus datos.
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
    </template>

    <!-- No encontrado -->
    <template v-else>
      <section class="py-16 text-center">
        <v-container>
          <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-file-question-outline</v-icon>
          <h1 class="text-h5 font-weight-bold mb-2">Módulo no encontrado</h1>
          <p class="text-body-1 text-medium-emphasis mb-6">
            El módulo que buscas no existe o fue movido.
          </p>
          <v-btn to="/modulos" color="primary" prepend-icon="mdi-arrow-left">
            Ver todos los módulos
          </v-btn>
        </v-container>
      </section>
    </template>
  </div>
</template>

<style scoped>
.section-tag {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #3B82F6;
  margin-bottom: 8px;
}

.shot-frame {
  background: #FFFFFF;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.shot-frame img {
  width: 100%;
  height: auto;
  display: block;
}

.shot-browserbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: #F8FAFC;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.shot-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #E2E8F0;
}

.shot-dot:nth-child(1) { background: #F87171; }
.shot-dot:nth-child(2) { background: #FBBF24; }
.shot-dot:nth-child(3) { background: #34D399; }

.shot-url {
  margin-left: 8px;
  font-size: 0.72rem;
  color: #64748B;
  background: #F1F5F9;
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 999px;
  padding: 3px 12px;
}

.legal-card {
  background: #FFFFFF;
  border: 1px solid rgba(72, 169, 166, 0.25);
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
}
</style>
