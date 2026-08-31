<script setup lang="ts">
definePageMeta({
  layout: 'landing',
})

useHead({
  title: 'Suite RH',
  meta: [
    {
      name: 'description',
      content:
        'Suite RH: plataforma integral de gestión humana — empleados, turnos, asistencia, ausencias, nómina y reportes para empresas en Colombia.',
    },
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: 'Suite RH — Gestión humana, turnos y nómina' },
    {
      property: 'og:description',
      content:
        'Empleados, asistencia, ausencias, nómina y reportes con cumplimiento de la normativa colombiana.',
    },
    { property: 'og:image', content: '/screenshots/dashboard1.png' },
  ],
})

const heroStyle = {
  backgroundImage:
    "radial-gradient(1000px 500px at 15% -10%, rgba(59,130,246,0.45), transparent 60%), radial-gradient(800px 400px at 90% 110%, rgba(72,169,166,0.35), transparent 60%), linear-gradient(160deg, #0B1B33 0%, #0F2440 55%, #1E3A5F 100%)",
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  minHeight: '92vh',
}

const stats = [
  { value: '42', label: 'Horas semanales máximas (Ley 2101)' },
  { value: '12', label: 'Tipos de ausencia y licencia' },
  { value: '3', label: 'Estados de nómina: borrador, aprobada, pagada' },
  { value: '100%', label: 'Cálculos automatizados' },
]

const features = [
  {
    slug: 'empleados',
    icon: 'mdi-account-group-outline',
    title: 'Gestión de empleados',
    text: 'Centraliza la información de tu equipo: datos, roles y estado en un solo lugar.',
  },
  {
    slug: 'turnos',
    icon: 'mdi-calendar-clock-outline',
    title: 'Turnos y horarios',
    text: 'Turnos fijos y rotativos con validación legal de jornada (6-9 h diarias, 42 h semanales).',
  },
  {
    slug: 'asistencia',
    icon: 'mdi-clock-in',
    title: 'Asistencia y horas extras',
    text: 'Control de entradas y salidas, horas extras con recargos legales y alertas en tiempo real.',
  },
  {
    slug: 'ausencias',
    icon: 'mdi-calendar-edit-outline',
    title: 'Ausencias y permisos',
    text: '12 tipos de licencias e incapacidades con aprobación y política por año.',
  },
  {
    slug: 'nomina',
    icon: 'mdi-cash-multiple',
    title: 'Liquidación de nómina',
    text: 'Devengados, deducciones y seguridad social con parámetros legales actualizables.',
  },
  {
    slug: 'roles',
    icon: 'mdi-shield-account-outline',
    title: 'Control por roles',
    text: 'Permisos granulares para administradores, gerencia, recursos humanos y empleados.',
  },
  {
    slug: 'reportes',
    icon: 'mdi-chart-bar',
    title: 'Reportes y estadísticas',
    text: 'Visualiza indicadores y exporta información para la toma de decisiones.',
  },
  {
    slug: 'evaluaciones',
    icon: 'mdi-clipboard-check-outline',
    title: 'Evaluación de desempeño',
    text: 'Plantillas por cargo, ciclo controlado por RRHH y PDF profesional.',
  },
  {
    slug: 'contratos',
    icon: 'mdi-file-document-multiple-outline',
    title: 'Historial y contratos',
    text: 'Períodos de vinculación, reingresos y contratos con historial completo.',
  },
]

const dashboardPoints = [
  {
    icon: 'mdi-chart-line',
    title: 'Evolución de nómina',
    text: 'Devengados, deducciones y neto a pagar mes a mes, con estados borrador / aprobada / pagada.',
  },
  {
    icon: 'mdi-chart-donut',
    title: 'Ausencias por tipo',
    text: 'Distribución visual de licencias, permisos e incapacidades para detectar tendencias.',
  },
  {
    icon: 'mdi-alert-outline',
    title: 'Alertas operativas',
    text: 'Nóminas pendientes de aprobación y novedades relevantes, notificadas en tiempo real.',
  },
]

const steps = [
  {
    number: '01',
    icon: 'mdi-account-plus-outline',
    title: 'Crea y gestiona usuarios',
    text: 'Registra empleados y asigna roles con permisos definidos.',
  },
  {
    number: '02',
    icon: 'mdi-cog-outline',
    title: 'Configura la operación',
    text: 'Define parámetros de nómina, calendarios y reglas de liquidación.',
  },
  {
    number: '03',
    icon: 'mdi-finance',
    title: 'Controla y decide',
    text: 'Liquida la nómina y consulta reportes, alertas y KPIs en tiempo real.',
  },
]

const benefits = [
  {
    icon: 'mdi-clock-fast',
    title: 'Ahorra tiempo',
    text: 'Automatiza nómina, asistencia y ausencias para eliminar planillas y errores manuales.',
  },
  {
    icon: 'mdi-scale-balance',
    title: 'Cumplimiento legal',
    text: 'Recargos, jornadas y aportes calculados con parámetros actualizados de la normativa colombiana.',
  },
  {
    icon: 'mdi-chart-box-outline',
    title: 'Decisiones con datos',
    text: 'Dashboard con KPIs de nómina, ausentismo y horas extras, exportable a CSV.',
  },
  {
    icon: 'mdi-office-building-outline',
    title: 'Multi-empresa',
    text: 'Administra varias empresas o clientes desde una sola plataforma, con datos aislados.',
  },
  {
    icon: 'mdi-shield-account-outline',
    title: 'Seguridad por roles',
    text: 'Permisos granulares y auditoría de acciones para proteger la información.',
  },
  {
    icon: 'mdi-bell-ring-outline',
    title: 'Alertas en tiempo real',
    text: 'Notificaciones de nóminas pendientes y novedades, sin depender de hojas de cálculo.',
  },
]

const roles = [
  {
    title: 'Administrador',
    icon: 'mdi-shield-crown-outline',
    text: 'Control total del sistema, usuarios y configuración.',
  },
  {
    title: 'Gerente',
    icon: 'mdi-briefcase-outline',
    text: 'Visión general de la operación y aprobaciones.',
  },
  {
    title: 'Recursos Humanos',
    icon: 'mdi-account-tie-outline',
    text: 'Gestión diaria de empleados y novedades.',
  },
  {
    title: 'Empleado',
    icon: 'mdi-badge-account-outline',
    text: 'Consulta de su información y documentos.',
  },
]
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="landing-hero d-flex align-center" :style="heroStyle">
      <v-container class="position-relative" style="z-index: 1">
        <v-row justify="center">
          <v-col cols="12" md="10" lg="9" class="text-center">
            <v-chip
              color="white"
              variant="outlined"
              label
              size="small"
              class="mb-6 px-4 hero-badge"
            >
              <v-icon start size="small" color="#48A9A6">mdi-check-decagram</v-icon>
              Cumplimiento Ley 2101 de 2021
            </v-chip>

            <h1 class="text-h3 text-md-h1 font-weight-black text-white mb-4 landing-title">
              Gestiona personas, turnos y nómina
              <span class="text-gradient">en un solo sistema</span>
            </h1>

            <p class="text-subtitle-1 text-white opacity-80 mb-8 mx-auto" style="max-width: 620px">
              Empleados, asistencia, ausencias, liquidación de nómina y reportes con
              cumplimiento de la normativa colombiana, en una sola plataforma.
            </p>

            <div class="d-flex justify-center ga-4 flex-wrap mb-12">
              <v-btn
                to="/auth/login"
                color="#48A9A6"
                variant="flat"
                size="x-large"
                class="px-8 hero-cta"
                prepend-icon="mdi-login"
              >
                Iniciar sesión
              </v-btn>
              <v-btn
                href="#funciones"
                variant="outlined"
                color="white"
                size="x-large"
                class="px-8"
              >
                Conocer el sistema
              </v-btn>
            </div>

            <!-- Stats -->
            <v-row class="justify-center">
              <v-col
                v-for="stat in stats"
                :key="stat.label"
                cols="6"
                sm="6"
                md="3"
              >
                <div class="stat-card">
                  <div class="stat-value">{{ stat.value }}</div>
                  <div class="stat-label">{{ stat.label }}</div>
                </div>
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Funciones -->
    <section id="funciones" class="py-16">
      <v-container>
        <div class="section-tag">Módulos</div>
        <h2 class="text-h4 text-center font-weight-bold mb-2">Funciones principales</h2>
        <p class="text-subtitle-1 text-medium-emphasis text-center mb-10" style="max-width: 560px; margin-left: auto; margin-right: auto">
          Todo el ciclo de gestión humana desde un solo lugar.
        </p>

        <v-row>
          <v-col v-for="feature in features" :key="feature.slug" cols="12" sm="6" lg="4">
            <v-card
              class="h-100 feature-card pa-5"
              variant="text"
              rounded="xl"
              :to="`/modulos/${feature.slug}`"
            >
              <v-avatar color="#E3F2FD" size="52" class="mb-4">
                <v-icon color="#3B82F6">{{ feature.icon }}</v-icon>
              </v-avatar>
              <div class="text-subtitle-1 font-weight-bold mb-1">{{ feature.title }}</div>
              <p class="text-body-2 text-medium-emphasis mb-0">{{ feature.text }}</p>
            </v-card>
          </v-col>
        </v-row>
        <div class="text-center mt-8">
          <v-btn
            to="/modulos"
            color="primary"
            variant="outlined"
            size="large"
            class="text-none"
            append-icon="mdi-arrow-right"
          >
            Ver todos los módulos
          </v-btn>
        </div>
      </v-container>
    </section>

    <!-- Capturas del sistema -->
    <section id="demo" class="py-16" style="background: linear-gradient(180deg, #F1F5F9, #F8FAFC)">
      <v-container>
        <div class="section-tag">Demo</div>
        <h2 class="text-h4 text-center font-weight-bold mb-2">Así se ve Suite RH</h2>
        <p class="text-subtitle-1 text-medium-emphasis text-center mb-10" style="max-width: 560px; margin-left: auto; margin-right: auto">
          Capturas reales del sistema con datos de demostración.
        </p>

        <div class="text-center mx-auto mb-8" style="max-width: 720px">
          <h3 class="text-h5 font-weight-bold mb-2">Dashboard de analítica en tiempo real</h3>
          <p class="text-body-1 text-medium-emphasis mb-0">
            Indicadores clave de tu operación de personal en una sola vista: nómina, ausencias y alertas para decidir con datos.
          </p>
        </div>

        <v-row class="mb-8">
          <v-col
            v-for="point in dashboardPoints"
            :key="point.title"
            cols="12"
            sm="4"
          >
            <div class="d-flex flex-column align-center text-center">
              <v-icon color="#3B82F6" size="28" class="mb-2">{{ point.icon }}</v-icon>
              <div class="text-body-2 font-weight-bold">{{ point.title }}</div>
              <div class="text-body-2 text-medium-emphasis">{{ point.text }}</div>
            </div>
          </v-col>
        </v-row>

        <v-row justify="center" class="mb-6">
          <v-col cols="12" md="6">
            <div class="shot-frame shot-dashboard">
              <div class="shot-browserbar">
                <span class="shot-dot"></span>
                <span class="shot-dot"></span>
                <span class="shot-dot"></span>
                <span class="shot-url">app.suite-rh.com/reports</span>
              </div>
              <img src="/screenshots/dashboard1.png" alt="Dashboard de Suite RH — indicadores" loading="lazy" />
              <div class="shot-label">Dashboard de analítica — indicadores</div>
            </div>
          </v-col>
          <v-col cols="12" md="6">
            <div class="shot-frame shot-dashboard">
              <div class="shot-browserbar">
                <span class="shot-dot"></span>
                <span class="shot-dot"></span>
                <span class="shot-dot"></span>
                <span class="shot-url">app.suite-rh.com/reports</span>
              </div>
              <img src="/screenshots/dashboard2.png" alt="Dashboard de Suite RH — gráficos" loading="lazy" />
              <div class="shot-label">Dashboard de analítica — gráficos</div>
            </div>
          </v-col>
        </v-row>

        <v-row>
          <v-col
            v-for="shot in [
              { src: '/screenshots/empleados.png', label: 'Gestión de empleados' },
              { src: '/screenshots/nomina.png', label: 'Liquidación de nómina' },
              { src: '/screenshots/ausencias.png', label: 'Ausencias y permisos' },
            ]"
            :key="shot.src"
            cols="12"
            sm="6"
            lg="4"
          >
            <div class="shot-frame">
              <img :src="shot.src" :alt="shot.label" loading="lazy" />
              <div class="shot-label">{{ shot.label }}</div>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Cómo funciona -->
    <section id="como-funciona" class="py-16" style="background: linear-gradient(180deg, #F8FAFC, #F1F5F9)">
      <v-container>
        <div class="section-tag">Proceso</div>
        <h2 class="text-h4 text-center font-weight-bold mb-2">Cómo funciona</h2>
        <p class="text-subtitle-1 text-medium-emphasis text-center mb-10" style="max-width: 560px; margin-left: auto; margin-right: auto">
          Tres pasos para poner tu operación de personas en orden.
        </p>

        <v-row>
          <v-col v-for="step in steps" :key="step.number" cols="12" md="4">
            <v-card class="h-100 text-center step-card pa-7" rounded="xl">
              <div class="step-number">{{ step.number }}</div>
              <v-avatar color="#48A9A6" size="56" class="mb-4 step-icon">
                <v-icon color="white">{{ step.icon }}</v-icon>
              </v-avatar>
              <div class="text-subtitle-1 font-weight-bold mb-1">{{ step.title }}</div>
              <p class="text-body-2 text-medium-emphasis mb-0">{{ step.text }}</p>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Beneficios -->
    <section id="beneficios" class="py-16" style="background: linear-gradient(180deg, #F1F5F9, #F8FAFC)">
      <v-container>
        <div class="section-tag">Beneficios</div>
        <h2 class="text-h4 text-center font-weight-bold mb-2">¿Por qué Suite RH?</h2>
        <p class="text-subtitle-1 text-medium-emphasis text-center mb-10" style="max-width: 560px; margin-left: auto; margin-right: auto">
          Resultados concretos para la operación diaria de tu equipo.
        </p>

        <v-row>
          <v-col v-for="benefit in benefits" :key="benefit.title" cols="12" sm="6" lg="4">
            <v-card class="h-100 pa-6 benefit-card" variant="text" rounded="xl">
              <v-avatar color="#E0F2F1" size="52" class="mb-4">
                <v-icon color="#00695C">{{ benefit.icon }}</v-icon>
              </v-avatar>
              <div class="text-subtitle-1 font-weight-bold mb-1">{{ benefit.title }}</div>
              <p class="text-body-2 text-medium-emphasis mb-0">{{ benefit.text }}</p>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Casos de éxito -->
    <section class="py-16" style="background: linear-gradient(180deg, #F8FAFC, #F1F5F9)">
      <v-container>
        <v-card
          class="pa-8 pa-sm-10 text-center mx-auto"
          max-width="640"
          color="#E3F2FD"
          variant="tonal"
          rounded="xl"
        >
          <v-icon size="44" color="#3B82F6" class="mb-3">mdi-star-circle-outline</v-icon>
          <div class="section-tag mb-2">Casos de éxito</div>
          <h3 class="text-h6 font-weight-bold mb-2">Historias reales, próximamente</h3>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Estamos construyendo esta sección con resultados de empresas que ya trabajan con Suite RH.
            Muy pronto la encontrarás aquí.
          </p>
        </v-card>
      </v-container>
    </section>

    <!-- Beneficios por rol -->
    <section id="roles" class="py-16">
      <v-container>
        <div class="section-tag">Roles</div>
        <h2 class="text-h4 text-center font-weight-bold mb-2">Diseñado para cada rol</h2>
        <p class="text-subtitle-1 text-medium-emphasis text-center mb-10" style="max-width: 560px; margin-left: auto; margin-right: auto">
          Cada perfil ve exactamente lo que necesita para su trabajo.
        </p>

        <v-row>
          <v-col v-for="role in roles" :key="role.title" cols="12" sm="6" lg="3">
            <v-card class="h-100 pa-5 role-card" variant="text" rounded="xl">
              <v-avatar color="#E0F2F1" size="52" class="mb-4">
                <v-icon color="#00695C">{{ role.icon }}</v-icon>
              </v-avatar>
              <div class="text-subtitle-1 font-weight-bold mb-1">{{ role.title }}</div>
              <p class="text-body-2 text-medium-emphasis mb-0">{{ role.text }}</p>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- CTA final -->
    <section
      class="py-16 text-center"
      style="background: linear-gradient(135deg, #0B1B33, #1E3A5F)"
    >
      <v-container>
        <h2 class="text-h4 font-weight-black text-white mb-3">
          ¿Listo para gestionar tu equipo con Suite RH?
        </h2>
        <p class="text-subtitle-1 text-white opacity-80 mb-8" style="max-width: 520px; margin-left: auto; margin-right: auto">
          Ingresa a tu cuenta o crea una para empezar.
        </p>
        <v-btn
          to="/auth/login"
          color="#48A9A6"
          variant="flat"
          size="x-large"
          class="px-10"
          prepend-icon="mdi-login"
        >
          Iniciar sesión
        </v-btn>
        <v-btn
          to="/contacto"
          variant="outlined"
          color="white"
          size="x-large"
          class="px-10 ml-4"
          prepend-icon="mdi-email-outline"
        >
          Contáctanos
        </v-btn>
      </v-container>
    </section>
  </div>
</template>

<style>
.landing-hero {
  position: relative;
  overflow: hidden;
}

.landing-title {
  line-height: 1.15;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.25);
}

.text-gradient {
  background: linear-gradient(90deg, #48A9A6, #90CAF9);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero-badge {
  border-color: rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8px);
}

.hero-cta {
  box-shadow: 0 8px 24px rgba(72, 169, 166, 0.35);
}

.stat-card {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 18px 12px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  backdrop-filter: blur(8px);
  transition: transform 0.2s ease, background 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-3px);
  background: rgba(255, 255, 255, 0.1);
}

.stat-value {
  font-size: 1.9rem;
  font-weight: 800;
  color: #90CAF9;
  line-height: 1.1;
}

.stat-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.75);
  margin-top: 4px;
  min-height: 2.4em;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.section-tag {
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.7rem;
  font-weight: 700;
  color: #48A9A6;
  margin-bottom: 8px;
}

.feature-card,
.role-card,
.benefit-card,
.step-card {
  background: #FFFFFF;
  border: 1px solid rgba(15, 23, 42, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.feature-card:hover,
.role-card:hover,
.benefit-card:hover,
.step-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
}

.step-number {
  font-size: 2.5rem;
  font-weight: 900;
  color: rgba(59, 130, 246, 0.12);
  line-height: 1;
  margin-bottom: 8px;
}

.step-icon {
  box-shadow: 0 6px 16px rgba(72, 169, 166, 0.3);
}

.shot-frame {
  background: #FFFFFF;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.shot-frame:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);
}

.shot-frame img {
  width: 100%;
  height: auto;
  display: block;
}

.shot-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #334155;
  padding: 10px 14px;
  border-top: 1px solid rgba(15, 23, 42, 0.06);
}

.shot-hero img {
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}

.shot-dashboard {
  max-width: 820px;
  margin-left: auto;
  margin-right: auto;
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
</style>
