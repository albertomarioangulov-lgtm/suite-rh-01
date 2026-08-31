<script setup lang="ts">
definePageMeta({
  layout: 'landing',
})

useHead({
  title: 'Contacto — Suite RH',
  meta: [
    {
      name: 'description',
      content:
        'Escríbenos para solicitar una demo, resolver dudas sobre Suite RH o hablar de una propuesta para tu empresa.',
    },
  ],
})

const form = ref({
  name: '',
  email: '',
  company: '',
  message: '',
  website: '',
})

const formRef = ref()
const sending = ref(false)
const sent = ref(false)
const error = ref('')

const required = (value: string) => !!value || 'Este campo es obligatorio'
const emailRule = (value: string) =>
  /.+@.+\..+/.test(value) || 'Ingresa un correo válido'

const submit = async () => {
  const { valid } = await formRef.value?.validate()
  if (!valid) return
  sending.value = true
  error.value = ''
  try {
    await $fetch('/api/v1/public/contact', {
      method: 'POST',
      body: { ...form.value },
    })
    sent.value = true
    form.value = { name: '', email: '', company: '', message: '', website: '' }
    formRef.value?.resetValidation()
  } catch {
    error.value =
      'No pudimos enviar tu mensaje. Intenta de nuevo en unos minutos.'
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="py-14 text-white" style="background: linear-gradient(160deg, #0B1B33 0%, #0F2440 55%, #1E3A5F 100%)">
      <v-container>
        <div class="text-caption text-uppercase font-weight-bold mb-2" style="color: #7DD3FC; letter-spacing: 0.08em">
          Contacto
        </div>
        <h1 class="text-h4 font-weight-bold mb-3">Hablemos de tu equipo</h1>
        <p class="text-subtitle-1 mb-0" style="max-width: 640px; color: rgba(255,255,255,0.75)">
          Cuéntanos tu caso: una demo con tus datos, una propuesta comercial o cualquier duda sobre Suite RH.
        </p>
      </v-container>
    </section>

    <!-- Formulario + información -->
    <section class="py-14" style="background: linear-gradient(180deg, #F8FAFC, #F1F5F9)">
      <v-container>
        <v-row>
          <v-col cols="12" lg="7">
            <v-card class="pa-6 pa-sm-8" rounded="xl" elevation="0" style="border: 1px solid rgba(15,23,42,0.08)">
              <v-alert
                v-if="sent"
                type="success"
                variant="tonal"
                class="mb-6"
                title="Mensaje enviado"
                text="Gracias por escribirnos. Te responderemos lo antes posible."
                closable
                @click:close="sent = false"
              />

              <v-alert
                v-if="error"
                type="error"
                variant="tonal"
                class="mb-6"
                :text="error"
                closable
                @click:close="error = ''"
              />

              <v-form ref="formRef" @submit.prevent="submit">
                <!-- Honeypot anti-bots: oculto para humanos -->
                <v-text-field
                  v-model="form.website"
                  name="website"
                  label="Sitio web"
                  autocomplete="off"
                  tabindex="-1"
                  aria-hidden="true"
                  style="display: none"
                />
                <v-row>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="form.name"
                      label="Nombre"
                      variant="outlined"
                      density="comfortable"
                      prepend-inner-icon="mdi-account-outline"
                      :rules="[required]"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="form.email"
                      label="Correo electrónico"
                      variant="outlined"
                      density="comfortable"
                      prepend-inner-icon="mdi-email-outline"
                      :rules="[required, emailRule]"
                    />
                  </v-col>
                  <v-col cols="12">
                    <v-text-field
                      v-model="form.company"
                      label="Empresa (opcional)"
                      variant="outlined"
                      density="comfortable"
                      prepend-inner-icon="mdi-office-building-outline"
                    />
                  </v-col>
                  <v-col cols="12">
                    <v-textarea
                      v-model="form.message"
                      label="Mensaje"
                      variant="outlined"
                      density="comfortable"
                      prepend-inner-icon="mdi-message-text-outline"
                      rows="5"
                      :rules="[required]"
                    />
                  </v-col>
                </v-row>
                <div class="d-flex align-center justify-space-between flex-wrap ga-3 mt-6">
                  <v-btn
                    type="submit"
                    color="primary"
                    size="large"
                    variant="flat"
                    class="px-8"
                    :loading="sending"
                    prepend-icon="mdi-send"
                  >
                    Enviar mensaje
                  </v-btn>
                  <span class="text-caption text-medium-emphasis">
                    Respondemos en máximo 1 día hábil.
                  </span>
                </div>
              </v-form>
            </v-card>
          </v-col>

          <v-col cols="12" lg="5">
            <div class="d-flex flex-column ga-4">
              <v-card class="pa-6" rounded="xl" elevation="0" style="border: 1px solid rgba(15,23,42,0.08)">
                <div class="d-flex align-center ga-3 mb-4">
                  <v-avatar color="#E3F2FD" size="48">
                    <v-icon color="#3B82F6">mdi-email-outline</v-icon>
                  </v-avatar>
                  <div>
                    <div class="text-subtitle-1 font-weight-bold">Correo</div>
                    <div class="text-body-2 text-medium-emphasis">hola@suite-rh.com</div>
                  </div>
                </div>
                <v-divider class="mb-4" />
                <div class="d-flex align-center ga-3 mb-4">
                  <v-avatar color="#E0F2F1" size="48">
                    <v-icon color="#00695C">mdi-phone-outline</v-icon>
                  </v-avatar>
                  <div>
                    <div class="text-subtitle-1 font-weight-bold">Teléfono</div>
                    <div class="text-body-2 text-medium-emphasis">+57 300 000 0000</div>
                  </div>
                </div>
                <v-divider class="mb-4" />
                <div class="d-flex align-center ga-3">
                  <v-avatar color="#FFF3E0" size="48">
                    <v-icon color="#E65100">mdi-clock-outline</v-icon>
                  </v-avatar>
                  <div>
                    <div class="text-subtitle-1 font-weight-bold">Horario</div>
                    <div class="text-body-2 text-medium-emphasis">Lunes a viernes, 8:00 a.m. – 6:00 p.m.</div>
                  </div>
                </div>
              </v-card>

              <v-card class="pa-6" rounded="xl" color="#0F2440">
                <div class="text-subtitle-1 text-white font-weight-bold mb-2">¿Quieres una demo?</div>
                <p class="text-body-2 mb-4" style="color: rgba(255,255,255,0.75)">
                  Te mostramos el sistema con un caso real de tu empresa, sin compromiso.
                </p>
                <v-btn
                  to="/auth/login"
                  color="orange-darken-1"
                  variant="flat"
                  prepend-icon="mdi-login"
                >
                  Iniciar sesión
                </v-btn>
              </v-card>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>
  </div>
</template>
