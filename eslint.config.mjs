import eslintConfigPrettier from 'eslint-config-prettier'
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

export default createConfigForNuxt({
  features: {
    // El estilo lo maneja Prettier; ESLint se enfoca en reglas de código.
    stylistic: false,
  },
}).append(
  {
    // Nuxt permite layouts con múltiples raíces (fragmentos).
    files: ['**/layouts/**/*.vue'],
    rules: {
      'vue/no-multiple-template-root': 'off',
    },
  },
  eslintConfigPrettier,
)
