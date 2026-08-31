<script setup lang="ts">
definePageMeta({
  layout: 'landing',
})

useHead({
  title: 'Seguridad — Suite RH',
  meta: [
    {
      name: 'description',
      content:
        'Cómo Suite RH protege la información de tu empresa: aislamiento multi-tenant, roles y permisos, auditoría, cifrado y cumplimiento de la Ley 1581 de 2012.',
    },
  ],
})

const pillars = [
  {
    icon: 'mdi-office-building-outline',
    title: 'Aislamiento multi-tenant',
    text: 'Cada empresa trabaja en un espacio de datos separado. La información de un cliente nunca se mezcla con la de otro.',
  },
  {
    icon: 'mdi-shield-account-outline',
    title: 'Roles y permisos',
    text: 'El acceso se controla por rol (administrador, gerente, RRHH, empleado) y por acción: ver, editar o aprobar.',
  },
  {
    icon: 'mdi-history',
    title: 'Auditoría',
    text: 'Las acciones sensibles quedan registradas con usuario, fecha y detalle para trazabilidad completa.',
  },
  {
    icon: 'mdi-lock-outline',
    title: 'Cifrado en tránsito',
    text: 'Las conexiones al sistema se realizan por HTTPS y las contraseñas se almacenan cifradas con hash.',
  },
  {
    icon: 'mdi-database-sync-outline',
    title: 'Respaldos',
    text: 'La base de datos cuenta con copias de seguridad automáticas y mecanismos de restauración.',
  },
  {
    icon: 'mdi-account-lock-outline',
    title: 'Protección de datos personales',
    text: 'El tratamiento de datos cumple la Ley 1581 de 2012: finalidad, necesidad, confidencialidad y derechos del titular.',
  },
]

const practices = [
  'La información se valida en el servidor antes de procesarse.',
  'Protección anti-spam y límites de intentos en formularios públicos.',
  'Sesiones con renovación y cierre automático por inactividad.',
  'Los mensajes y textos se tratan como texto plano, nunca como código ejecutable.',
  'Contraseñas almacenadas cifradas, nunca en texto plano.',
  'Acceso de lectura a datos sensibles solo para administradores.',
]
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="py-14 text-white" style="background: linear-gradient(160deg, #0B1B33 0%, #0F2440 55%, #1E3A5F 100%)">
      <v-container>
        <div class="text-caption text-uppercase font-weight-bold mb-2" style="color: #7DD3FC; letter-spacing: 0.08em">
          Seguridad
        </div>
        <h1 class="text-h4 font-weight-bold mb-3">La información de tu equipo, protegida</h1>
        <p class="text-subtitle-1 mb-0" style="max-width: 660px; color: rgba(255,255,255,0.75)">
          Diseñado para datos sensibles de RRHH: aislamiento por empresa, control de acceso, auditoría y cumplimiento normativo.
        </p>
      </v-container>
    </section>

    <!-- Pilares -->
    <section class="py-14" style="background: linear-gradient(180deg, #F8FAFC, #F1F5F9)">
      <v-container>
        <v-row>
          <v-col v-for="pillar in pillars" :key="pillar.title" cols="12" sm="6" lg="4">
            <v-card class="h-100 pa-6" rounded="xl" elevation="0" style="border: 1px solid rgba(15,23,42,0.08)">
              <v-avatar color="#E3F2FD" size="52" class="mb-4">
                <v-icon color="#3B82F6">{{ pillar.icon }}</v-icon>
              </v-avatar>
              <div class="text-subtitle-1 font-weight-bold mb-1">{{ pillar.title }}</div>
              <p class="text-body-2 text-medium-emphasis mb-0">{{ pillar.text }}</p>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Prácticas -->
    <section class="py-14" style="background: #FFFFFF">
      <v-container>
        <div class="section-tag">Buenas prácticas</div>
        <h2 class="text-h5 text-center font-weight-bold mb-10">Medidas aplicadas en el sistema</h2>
        <v-row justify="center">
          <v-col cols="12" md="8">
            <v-list lines="two" density="comfortable">
              <v-list-item
                v-for="practice in practices"
                :key="practice"
                prepend-icon="mdi-check-decagram"
                prepend-icon-color="#48A9A6"
                :title="practice"
                title-class="text-body-2"
                class="mb-2"
                style="border: 1px solid rgba(15,23,42,0.06); border-radius: 12px"
              />
            </v-list>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- CTA -->
    <section class="py-14 text-center" style="background: #0F2440">
      <v-container>
        <h2 class="text-h5 text-white font-weight-bold mb-3">¿Tienes requisitos específicos de seguridad?</h2>
        <p class="text-body-1 mb-6" style="color: rgba(255,255,255,0.7)">
          Cuéntanoslos y los revisamos en una llamada sin compromiso.
        </p>
        <v-btn to="/contacto" color="orange-darken-1" variant="flat" size="large" prepend-icon="mdi-email-outline">
          Contáctanos
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
