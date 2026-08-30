<script setup lang="ts">
import type { AuthUser } from '~~/shared/auth'

const props = defineProps<{
  modelValue: boolean
  user?: AuthUser | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved', user: AuthUser): void
}>()

const formSaving = ref(false)

watch(
  () => props.modelValue,
  (open) => {
    if (open) formSaving.value = false
  },
)

const title = computed(() => (props.user ? `Editar: ${props.user.name}` : 'Nuevo usuario'))

const close = () => emit('update:modelValue', false)

const onSaved = (user: AuthUser) => {
  close()
  emit('saved', user)
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="560"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="position-relative">
      <v-progress-linear
        :indeterminate="formSaving"
        :color="user ? '#E0E0E0' : '#90CAF9'"
        :bg-color="user ? '#757575' : 'primary'"
        bg-opacity="1"
        height="4"
        class="position-absolute top-0 left-0 right-0"
        style="z-index: 1"
      />
      <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center ga-2">
        <v-icon color="primary">
          {{ user ? 'mdi-account-edit-outline' : 'mdi-account-plus-outline' }}
        </v-icon>
        {{ title }}
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" @click="close" />
      </v-card-title>
      <v-divider />

      <v-card-text class="pt-4">
        <UsersForm
          v-if="modelValue"
          :user="user"
          @saved="onSaved"
          @cancel="close"
          @saving-change="formSaving = $event"
        />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
