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
        'Plataforma profesional para gestionar la nómina de tu empresa: empleados, liquidación, reportes y control por roles.',
    },
  ],
})

const heroStyle = {
  backgroundImage:
    "linear-gradient(rgba(10, 22, 44, 0.82), rgba(10, 22, 44, 0.9)), url('/images/login/login-finanzas-graficas.jpg')",
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  minHeight: '86vh',
}

const features = [
  {
    icon: 'mdi-account-group-outline',
    title: 'Gestión de empleados',
    text: 'Centraliza la información de tu equipo: datos, roles y estado en un solo lugar.',
  },
  {
    icon: 'mdi-cash-multiple',
    title: 'Liquidación de nómina',
    text: 'Calcula salarios, deducciones y aportes con precisión y trazabilidad.',
  },
  {
    icon: 'mdi-shield-account-outline',
    title: 'Control por roles',
    text: 'Permisos granulares para administradores, gerencia, recursos humanos y empleados.',
  },
  {
    icon: 'mdi-chart-bar',
    title: 'Reportes y estadísticas',
    text: 'Visualiza indicadores y exporta información para la toma de decisiones.',
  },
  {
    icon: 'mdi-lock-outline',
    title: 'Sesiones seguras',
    text: 'Sesiones protegidas con cookies seguras y renovación automática.',
  },
  {
    icon: 'mdi-calendar-check-outline',
    title: 'Fechas inteligentes',
    text: 'Cálculo de rangos, horas y vencimientos con soporte de zonas horarias.',
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
    title: 'Liquida y reporta',
    text: 'Genera la nómina del período y consulta reportes en tiempo real.',
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
    <section class="d-flex align-center justify-center text-center" :style="heroStyle">
      <v-container>
        <v-row justify="center">
          <v-col cols="12" md="10" lg="8">
            <img
              src="/images/logo-suite-rh-blanco.svg"
              alt="Suite RH"
              height="56"
              class="mb-6"
            />
            <v-chip color="orange-darken-1" variant="flat" label size="small" class="mb-5">
              <v-icon start size="small">mdi-cash-lock-open</v-icon>
              Nómina profesional para empresas
            </v-chip>

            <h1 class="text-h3 text-md-h2 font-weight-bold text-white mb-4">
              Gestiona la nómina de tu empresa con precisión y tranquilidad
            </h1>

            <p class="text-subtitle-1 text-white opacity-80 mb-8 mx-auto" style="max-width: 640px">
              Una plataforma segura para administrar empleados, roles, liquidaciones y reportes,
              pensada para el mercado colombiano.
            </p>

            <div class="d-flex justify-center ga-4 flex-wrap">
              <v-btn
                to="/auth/login"
                color="orange-darken-1"
                variant="flat"
                size="x-large"
                prepend-icon="mdi-login"
              >
                Iniciar sesión
              </v-btn>
              <v-btn href="#funciones" variant="outlined" color="white" size="x-large">
                Conocer el sistema
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Funciones -->
    <section id="funciones" class="py-12">
      <v-container>
        <h2 class="text-h4 text-center font-weight-bold mb-2">Funciones principales</h2>
        <p class="text-subtitle-1 text-medium-emphasis text-center mb-8">
          Todo lo necesario para operar tu nómina desde un solo lugar.
        </p>

        <v-row>
          <v-col v-for="feature in features" :key="feature.title" cols="12" sm="6" lg="4">
            <v-card class="h-100 pa-4" variant="outlined" rounded="lg">
              <v-icon size="42" color="primary" class="mb-3">
                {{ feature.icon }}
              </v-icon>
              <v-card-title class="pa-0 mb-1 text-subtitle-1 font-weight-bold">
                {{ feature.title }}
              </v-card-title>
              <v-card-text class="pa-0 text-body-2 text-medium-emphasis">
                {{ feature.text }}
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Cómo funciona -->
    <section id="como-funciona" class="py-12" style="background: #f5f7fa">
      <v-container>
        <h2 class="text-h4 text-center font-weight-bold mb-2">Cómo funciona</h2>
        <p class="text-subtitle-1 text-medium-emphasis text-center mb-8">
          Tres pasos para poner tu nómina en orden.
        </p>

        <v-row>
          <v-col v-for="step in steps" :key="step.number" cols="12" md="4">
            <v-card class="h-100 text-center pa-6" rounded="lg">
              <div class="text-h2 font-weight-black text-primary opacity-20">
                {{ step.number }}
              </div>
              <v-icon size="44" color="orange-darken-1" class="my-2">
                {{ step.icon }}
              </v-icon>
              <v-card-title class="pa-0 justify-center mb-1 text-subtitle-1 font-weight-bold">
                {{ step.title }}
              </v-card-title>
              <v-card-text class="pa-0 text-body-2 text-medium-emphasis">
                {{ step.text }}
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Beneficios por rol -->
    <section id="beneficios" class="py-12">
      <v-container>
        <h2 class="text-h4 text-center font-weight-bold mb-2">Diseñado para cada rol</h2>
        <p class="text-subtitle-1 text-medium-emphasis text-center mb-8">
          Cada perfil ve exactamente lo que necesita para su trabajo.
        </p>

        <v-row>
          <v-col v-for="role in roles" :key="role.title" cols="12" sm="6" lg="3">
            <v-card class="h-100 pa-4" variant="outlined" rounded="lg">
              <v-avatar color="primary" variant="tonal" size="52" class="mb-3">
                <v-icon>{{ role.icon }}</v-icon>
              </v-avatar>
              <v-card-title class="pa-0 mb-1 text-subtitle-1 font-weight-bold">
                {{ role.title }}
              </v-card-title>
              <v-card-text class="pa-0 text-body-2 text-medium-emphasis">
                {{ role.text }}
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- CTA final -->
    <section
      class="py-12 text-center"
      style="background: linear-gradient(135deg, #0f2440, #243e6f)"
    >
      <v-container>
        <h2 class="text-h4 font-weight-bold text-white mb-3">¿Listo para gestionar tu nómina?</h2>
        <p class="text-subtitle-1 text-white opacity-80 mb-6">
          Ingresa a tu cuenta o crea una para empezar.
        </p>
        <v-btn
          to="/auth/login"
          color="orange-darken-1"
          variant="flat"
          size="x-large"
          prepend-icon="mdi-login"
        >
          Iniciar sesión
        </v-btn>
      </v-container>
    </section>
  </div>
</template>

<style scoped>
.opacity-80 {
  opacity: 0.8;
}

.opacity-20 {
  opacity: 0.2;
}
</style>
