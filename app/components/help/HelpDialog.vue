<script setup lang="ts">
const { helpDialogOpen, helpSectionId, openHelp, closeHelp } = useHelp()
</script>

<template>
  <v-dialog
    v-model="helpDialogOpen"
    max-width="900"
    :fullscreen="$vuetify.display.smAndDown"
    transition="dialog-bottom-transition"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-btn
          v-if="helpSectionId"
          variant="text"
          icon="mdi-arrow-left"
          title="Volver a temas"
          class="mr-1"
          @click="openHelp(null)"
        />
        <v-icon class="mr-2" color="primary">mdi-help-circle-outline</v-icon>
        <span class="text-subtitle-1 font-weight-bold">Ayuda</span>
        <v-spacer />
        <v-btn variant="text" icon="mdi-close" title="Cerrar" @click="closeHelp" />
      </v-card-title>
      <v-divider />
      <v-card-text class="pt-4">
        <HelpContent
          :section-id="helpSectionId"
          show-full-page-link
          @select="(id: string) => openHelp(id)"
        />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
