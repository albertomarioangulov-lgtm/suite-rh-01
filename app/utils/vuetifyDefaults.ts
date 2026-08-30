export type AppDensity = 'compact' | 'comfortable' | 'default'

export const DENSITY_OPTIONS: { id: AppDensity; label: string; icon: string }[] = [
  { id: 'compact', label: 'Compacto', icon: 'mdi-arrow-collapse-vertical' },
  { id: 'default', label: 'Normal', icon: 'mdi-format-line-spacing' },
  { id: 'comfortable', label: 'Cómodo', icon: 'mdi-arrow-expand-vertical' },
]

/** Densidad por defecto del sistema (coincide con la actual). */
export const DEFAULT_DENSITY: AppDensity = 'compact'

/**
 * Construye los defaults globales de Vuetify según la densidad elegida.
 * Se usa al crear Vuetify y al cambiar la densidad en caliente.
 */
export const buildVuetifyDefaults = (density: AppDensity) => ({
  VBtn: { color: 'on-surface', rounded: 'lg' },
  VCard: { rounded: 'lg' },
  VToolbar: { density },
  VDataTable: { density, hover: true },
  VDataTableServer: { density, hover: true },
  VTable: { density },
  VTextField: { variant: 'filled', density, hideDetails: 'auto' },
  VTextarea: { variant: 'filled', density, hideDetails: 'auto' },
  VColorInput: { variant: 'filled', density, hideDetails: 'auto' },
  VDateInput: { variant: 'filled', density, hideDetails: 'auto' },
  VAutocomplete: { variant: 'filled', density, hideDetails: 'auto' },
  VCombobox: { variant: 'filled', density, hideDetails: 'auto' },
  VSelect: { variant: 'filled', density, hideDetails: 'auto' },
})
