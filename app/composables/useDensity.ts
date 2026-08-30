import {
  DEFAULT_DENSITY,
  DENSITY_OPTIONS,
  buildVuetifyDefaults,
  type AppDensity,
} from '~/utils/vuetifyDefaults'

const STORAGE_KEY = 'suite-rh-density'

/**
 * Preferencia global de densidad (Compacto / Normal / Cómodo).
 * Se persiste en localStorage y se aplica en caliente a los defaults de Vuetify.
 */
export const useDensity = () => {
  const nuxtApp = useNuxtApp()
  const vuetify = nuxtApp.$vuetify as
    | { defaults: { value: Record<string, unknown> } }
    | undefined

  const density = useState<AppDensity>('app-density', () => DEFAULT_DENSITY)

  // Aplica la densidad actual a los defaults globales de Vuetify (SSR y cliente).
  watchEffect(() => {
    if (vuetify) {
      vuetify.defaults.value = buildVuetifyDefaults(density.value)
    }
  })

  // Después de la hidratación, restaura la preferencia guardada sin romper el SSR
  // y persiste los cambios futuros.
  onMounted(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as AppDensity | null
    if (saved && DENSITY_OPTIONS.some((option) => option.id === saved)) {
      density.value = saved
    }
    watch(
      () => density.value,
      (value) => localStorage.setItem(STORAGE_KEY, value),
    )
  })

  const setDensity = (value: AppDensity) => {
    density.value = value
  }

  return {
    density,
    options: DENSITY_OPTIONS,
    setDensity,
  }
}

export default useDensity
