import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@vueuse/nuxt', 'nuxt-auth-utils'],

  plugins: ['~/plugins/echarts.ts'],

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
        },
      ],
      script: [
        {
          // Aplica el tema guardado antes de la hidratación para evitar
          // el parpadeo claro→oscuro y los warnings de hydration mismatch.
          innerHTML: `(function () {
  try {
    var themes = {
      myCustomLightTheme: '#F1F5F9',
      myCustomDarkTheme: '#09090B',
      myCustomColorfulTheme: '#FFF8E1',
      myCustomNatureTheme: '#E8F5E9'
    };
    var saved = localStorage.getItem('suite-rh-theme');
    var theme = themes[saved] ? saved : 'myCustomLightTheme';
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.backgroundColor = themes[theme];
    // Si el tema guardado no es el claro (que es el que renderiza el SSR),
    // oculta la app hasta que Vue aplique el tema, evitando el flash blanco.
    var hidden = theme !== 'myCustomLightTheme';
    var style = document.createElement('style');
    style.id = 'theme-preload-style';
    style.textContent = '.v-application{background-color:' + themes[theme] + ' !important' + (hidden ? ';visibility:hidden' : '') + '}';
    document.head.appendChild(style);
  } catch (e) {}
})();`,
        },
      ],
    },
  },

  // Auto-import de composables en subcarpetas (ej. composables/states/*),
  // igual que en casaroca-01.
  imports: {
    dirs: ['composables/*/*.{ts,js,mjs,mts}'],
  },

  routeRules: {
    '/inicio': { redirect: '/home' },
    '/auth/register': { redirect: '/auth/login' },
    '/settings': { redirect: '/admin/configuration' },
    '/employees': { redirect: '/admin/employees' },
    '/payrolls': { redirect: '/admin/payroll' },
    // CORS de /api/** se maneja en server/middleware/cors.ts (allowlist CORS_ORIGINS).
  },

  build: {
    transpile: ['vuetify'],
  },

  vite: {
    plugins: [vuetify({ autoImport: true })],
    vue: {
      template: {
        transformAssetUrls,
      },
    },
  },

  typescript: {
    strict: true,
    // typeCheck: true requiere `typescript` y `vue-tsc` (instalar con red: pnpm add -D typescript vue-tsc)
    typeCheck: false,
  },

  runtimeConfig: {
    mongodbUri: process.env.MONGODB_URI || '',
    mongodbName: process.env.MONGODB_NAME || 'nomina_app',
    mongodbServerSelectionTimeoutMS: 10000,
    mongodbMaxPoolSize: 10,
    corsOrigins: process.env.CORS_ORIGINS || '',
    brevoApiKey: process.env.BREVO_API_KEY || '',
    brevoSenderEmail: process.env.BREVO_SENDER_EMAIL || '',
    brevoWebhookSecret: process.env.BREVO_WEBHOOK_SECRET || '',
    /** Secreto para cifrar el certificado .p12 y su contraseña (AES-256-GCM). */
    dianCertSecret: process.env.DIAN_CERT_SECRET || '',
    appUrl: process.env.APP_URL || 'http://localhost:3000',

    // Sesión sellada de nuxt-auth-utils (cookie httpOnly cifrada).
    session: {
      password: process.env.NUXT_SESSION_PASSWORD || '',
      name: 'nomina_session',
      maxAge: 60 * 60 * 24 * 7, // 7 días
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    },

    public: {
      appName: process.env.APP_NAME || 'Nómina',
    },
  },
})
