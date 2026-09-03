// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: ['nuxt-vercel-analytics'],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // Server-only (private) keys
    databaseUrl: process.env.DATABASE_URL,
    adminPath: process.env.NUXT_ADMIN_PATH || 'panel-ae-secure',
    adminEmail: process.env.NUXT_ADMIN_EMAIL || '',
    sessionSecret: process.env.NUXT_SESSION_SECRET || 'change-me-in-production',
    resendApiKey: process.env.RESEND_API_KEY || '',
    blobToken: process.env.BLOB_READ_WRITE_TOKEN || '',
    // Accepts KEVERD_SECRET_KEY (docs) or NUXT_KEVERD_SECRET_KEY (Nuxt convention)
    keverdSecretKey: process.env.NUXT_KEVERD_SECRET_KEY || process.env.KEVERD_SECRET_KEY || '',
    
    // Public keys (exposed to client)
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      siteName: process.env.NUXT_PUBLIC_SITE_NAME || 'Auto Electronics',
      whatsappNumber: process.env.NUXT_PUBLIC_WHATSAPP_NUMBER || '',
      gaMeasurementId: process.env.NUXT_PUBLIC_GA_MEASUREMENT_ID || '',
      defaultPixel: process.env.NUXT_PUBLIC_DEFAULT_PIXEL || '',
      keverdPublicKey: process.env.NUXT_PUBLIC_KEVERD_PUBLIC_KEY || '',
    },
  },

  routeRules: {
    '/**': {
      headers: {
        'X-Frame-Options': 'SAMEORIGIN',
        'Content-Security-Policy': "frame-ancestors 'self'",
      },
    },
    '/': { ssr: true },
    '/products': { ssr: true },
    '/product/**': { ssr: true },
  },

  nitro: {
    preset: 'vercel',
  },

  vite: {
    optimizeDeps: {
      include: ['@keverdjs/agent'],
    },
  },

  app: {
    head: {
      title: 'Auto Electronics',
      htmlAttrs: {
        lang: 'en',
      },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Selected electronics with pack pricing. Pay on delivery.' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    },
  },

  compatibilityDate: '2024-12-01',
})
