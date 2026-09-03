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
    
    // Public keys (exposed to client)
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      siteName: process.env.NUXT_PUBLIC_SITE_NAME || 'Auto Electronics',
      whatsappNumber: process.env.NUXT_PUBLIC_WHATSAPP_NUMBER || '',
      gaMeasurementId: process.env.NUXT_PUBLIC_GA_MEASUREMENT_ID || '',
      defaultPixel: process.env.NUXT_PUBLIC_DEFAULT_PIXEL || '',
    },
  },

  routeRules: {
    // Prerender public pages
    '/': { prerender: true },
    '/products': { prerender: true },
    '/product/**': { prerender: true },
  },

  nitro: {
    preset: 'vercel',
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
