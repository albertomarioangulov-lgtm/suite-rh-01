// import this after install `@mdi/font` package
import '@mdi/font/css/materialdesignicons.css'

import 'vuetify/styles'
import { createVuetify, type ThemeDefinition } from 'vuetify'
import { md3 } from 'vuetify/blueprints'
import { buildVuetifyDefaults, DEFAULT_DENSITY } from '~/utils/vuetifyDefaults'

const myCustomLightTheme: ThemeDefinition = {
  dark: false,
  colors: {
    background: '#F1F5F9',
    surface: '#FFFFFF',
    'surface-bright': '#FFFFFF',
    'surface-light': '#F1F5F9',
    'surface-variant': '#E2E8F0',
    primary: '#3B82F6',
    'primary-darken-1': '#2563EB',
    secondary: '#64748B',
    'secondary-darken-1': '#475569',
    error: '#DC2626',
    info: '#0284C7',
    success: '#16A34A',
    warning: '#D97706',
  },
  variables: {
    'border-color': '#0F172A',
    'border-opacity': 0.12,
    'high-emphasis-opacity': 0.87,
    'medium-emphasis-opacity': 0.6,
    'disabled-opacity': 0.38,
    'idle-opacity': 0.04,
    'hover-opacity': 0.04,
    'focus-opacity': 0.12,
    'selected-opacity': 0.08,
    'activated-opacity': 0.12,
    'pressed-opacity': 0.12,
    'dragged-opacity': 0.08,
    'theme-kbd': '#212529',
    'theme-on-kbd': '#FFFFFF',
    'theme-code': '#F5F5F5',
    'theme-on-code': '#000000',
  },
}

const myCustomDarkTheme: ThemeDefinition = {
  dark: true,
  colors: {
    background: '#09090B',
    surface: '#0F172A',
    'surface-bright': '#1E293B',
    'surface-light': '#1E293B',
    'surface-variant': '#94A3B8',
    primary: '#3B82F6',
    'primary-darken-1': '#2563EB',
    secondary: '#94A3B8',
    'secondary-darken-1': '#CBD5E1',
    error: '#F87171',
    info: '#38BDF8',
    success: '#4ADE80',
    warning: '#FBBF24',
  },
  variables: {
    'border-color': '#CBD5E1',
    'border-opacity': 0.12,
    'high-emphasis-opacity': 1.0,
    'medium-emphasis-opacity': 0.7,
    'disabled-opacity': 0.5,
    'idle-opacity': 0.1,
    'hover-opacity': 0.08,
    'focus-opacity': 0.12,
    'selected-opacity': 0.16,
    'activated-opacity': 0.14,
    'pressed-opacity': 0.12,
    'dragged-opacity': 0.08,
    'theme-kbd': '#212529',
    'theme-on-kbd': '#FFFFFF',
    'theme-code': '#343434',
    'theme-on-code': '#CCCCCC',
  },
}

const myCustomColorfulTheme: ThemeDefinition = {
  dark: false,
  colors: {
    background: '#FFF8E1',
    surface: '#FFECB3',
    'surface-bright': '#FFFFFF',
    'surface-light': '#FFE082',
    'surface-variant': '#795548',
    primary: '#E91E63',
    'primary-darken-1': '#C2185B',
    secondary: '#FF5722',
    'secondary-darken-1': '#E64A19',
    error: '#F44336',
    info: '#03A9F4',
    success: '#8BC34A',
    warning: '#FF9800',
  },
  variables: {
    'border-color': '#4E342E',
    'border-opacity': 0.16,
    'high-emphasis-opacity': 0.87,
    'medium-emphasis-opacity': 0.6,
    'disabled-opacity': 0.38,
    'idle-opacity': 0.04,
    'hover-opacity': 0.04,
    'focus-opacity': 0.12,
    'selected-opacity': 0.08,
    'activated-opacity': 0.12,
    'pressed-opacity': 0.12,
    'dragged-opacity': 0.08,
    'theme-kbd': '#212529',
    'theme-on-kbd': '#FFFFFF',
    'theme-code': '#FFF3E0',
    'theme-on-code': '#4E342E',
  },
}

const myCustomNatureTheme: ThemeDefinition = {
  dark: false,
  colors: {
    background: '#E8F5E9',
    surface: '#C8E6C9',
    'surface-bright': '#FFFFFF',
    'surface-light': '#A5D6A7',
    'surface-variant': '#3E2723',
    primary: '#2E7D32',
    'primary-darken-1': '#1B5E20',
    secondary: '#00695C',
    'secondary-darken-1': '#004D40',
    error: '#C62828',
    info: '#1565C0',
    success: '#558B2F',
    warning: '#F9A825',
  },
  variables: {
    'border-color': '#1B5E20',
    'border-opacity': 0.12,
    'high-emphasis-opacity': 0.87,
    'medium-emphasis-opacity': 0.6,
    'disabled-opacity': 0.38,
    'idle-opacity': 0.04,
    'hover-opacity': 0.04,
    'focus-opacity': 0.12,
    'selected-opacity': 0.08,
    'activated-opacity': 0.12,
    'pressed-opacity': 0.12,
    'dragged-opacity': 0.08,
    'theme-kbd': '#212529',
    'theme-on-kbd': '#FFFFFF',
    'theme-code': '#F1F8E9',
    'theme-on-code': '#1B5E20',
  },
}

export default defineNuxtPlugin((app) => {
  const vuetify = createVuetify({
    blueprint: md3,

    defaults: {
      ...buildVuetifyDefaults(DEFAULT_DENSITY),
    },

    theme: {
      defaultTheme: 'myCustomLightTheme',
      themes: {
        myCustomLightTheme,
        myCustomDarkTheme,
        myCustomColorfulTheme,
        myCustomNatureTheme,
      },
    },
  })

  app.vueApp.use(vuetify)
  app.provide('vuetify', vuetify)
})
