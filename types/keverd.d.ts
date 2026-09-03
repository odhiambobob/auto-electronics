import type { KeverdCheckoutEvent } from '~/composables/useKeverd'

declare module '#app' {
  interface NuxtApp {
    $getKeverdEvent: () => Promise<KeverdCheckoutEvent | null>
  }
}

export {}
