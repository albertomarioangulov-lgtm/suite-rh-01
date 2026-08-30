import { useTheme } from 'vuetify'

export interface ThemeOption {
  id: string
  label: string
  icon: string
}

export const useThemeToggle = () => {
  const vuetifyTheme = useTheme()

  const themes: ThemeOption[] = [
    { id: 'myCustomLightTheme', label: 'Claro', icon: 'mdi-weather-sunny' },
    { id: 'myCustomDarkTheme', label: 'Oscuro', icon: 'mdi-weather-night' },
    { id: 'myCustomColorfulTheme', label: 'Colorido', icon: 'mdi-palette' },
    { id: 'myCustomNatureTheme', label: 'Naturaleza', icon: 'mdi-leaf' },
  ]

  const currentThemeId = computed(() => vuetifyTheme.global.name.value)

  const currentTheme = computed(
    (): ThemeOption => themes.find((t) => t.id === currentThemeId.value) || themes[0]!,
  )

  const initTheme = async () => {
    // El script del head ya dejó el tema en data-theme antes de la hidratación.
    const savedTheme =
      document.documentElement.getAttribute('data-theme') ||
      localStorage.getItem('suite-rh-theme') ||
      localStorage.getItem('nomina-theme')
    if (savedTheme && themes.some((t) => t.id === savedTheme)) {
      vuetifyTheme.change(savedTheme)
    }
    // Espera a que Vue renderice el tema y recién entonces revela la app,
    // para que no aparezca ni un frame con el tema claro.
    await nextTick()
    document.getElementById('theme-preload-style')?.remove()
  }

  const setTheme = (themeId: string) => {
    vuetifyTheme.change(themeId)
    localStorage.setItem('suite-rh-theme', themeId)
    if (import.meta.client) {
      document.documentElement.setAttribute('data-theme', themeId)
    }
  }

  onMounted(() => {
    if (import.meta.client) {
      initTheme()
    }
  })

  return {
    themes,
    currentTheme,
    currentThemeId,
    setTheme,
    themeIcon: computed(() => currentTheme.value.icon),
    themeTooltip: computed(() => currentTheme.value.label),
  }
}
