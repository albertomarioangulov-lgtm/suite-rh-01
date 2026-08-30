<script setup lang="ts">
const navLinks = [
  { label: 'Funciones', href: '#funciones' },
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'Beneficios', href: '#beneficios' },
  { label: 'Contacto', href: '#contacto' },
]
</script>

<template>
  <div>
    <header class="d-flex align-center px-4 px-sm-6 py-3 sticky-header" style="background: #0f2440">
      <a href="/" class="d-flex align-center text-decoration-none">
        <img src="/images/logo-suite-rh-blanco.svg" alt="Suite RH" height="40" />
      </a>

      <v-spacer />

      <nav class="d-none d-sm-flex align-center ga-6">
        <a
          v-for="link in navLinks"
          :key="link.href"
          :href="link.href"
          class="text-body-2 text-white text-decoration-none opacity-80"
        >
          {{ link.label }}
        </a>
      </nav>

      <v-btn
        to="/auth/login"
        color="orange-darken-1"
        variant="flat"
        class="ml-6"
        prepend-icon="mdi-login"
      >
        Iniciar sesión
      </v-btn>
    </header>

    <main>
      <slot />
    </main>

    <footer id="contacto" class="pa-6 text-center" style="background: #0b1b33">
      <img src="/images/logo-suite-rh-blanco.svg" alt="Suite RH" height="34" class="mb-3" />
      <p class="text-body-2 text-white opacity-80 mb-1">
        Gestión de personas, turnos y nómina para empresas en Colombia.
      </p>
      <p class="text-caption text-white opacity-60">
        © {{ new Date().getFullYear() }} Suite RH. Todos los derechos reservados.
      </p>
    </footer>
  </div>
</template>

<style scoped>
.sticky-header {
  position: sticky;
  top: 0;
  z-index: 10;
}

.opacity-80 {
  opacity: 0.8;
}

.opacity-60 {
  opacity: 0.6;
}
</style>
