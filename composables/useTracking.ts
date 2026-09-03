import type { EventType } from '~/types/store'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    _fbq?: unknown
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export function useTracking() {
  const config = useRuntimeConfig()
  
  // Get or create visitor ID
  function getVisitorId(): string {
    if (import.meta.server) return ''
    
    let visitorId = localStorage.getItem('ae.visitorId')
    if (!visitorId) {
      visitorId = `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
      localStorage.setItem('ae.visitorId', visitorId)
    }
    return visitorId
  }

  // Track event to backend for analytics
  async function track(eventType: EventType, data?: { productId?: string; metadata?: Record<string, unknown> }) {
    if (import.meta.server) return
    
    try {
      await $fetch('/api/tracking', {
        method: 'POST',
        body: {
          visitorId: getVisitorId(),
          eventType,
          productId: data?.productId,
          metadata: data?.metadata,
        },
      })
    } catch {
      // Silently fail tracking
    }
  }

  function loadScript(src: string, id: string) {
    if (import.meta.server) return
    if (document.getElementById(id)) return
    const script = document.createElement('script')
    script.id = id
    script.async = true
    script.src = src
    document.head.appendChild(script)
  }

  function initGoogleAnalytics() {
    if (import.meta.server) return
    const id = config.public.gaMeasurementId
    if (!id) return
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${id}`, 'ga-src')
    window.dataLayer = window.dataLayer || []
    window.gtag = (...args: unknown[]) => {
      window.dataLayer?.push(args)
    }
    window.gtag('js', new Date())
    window.gtag('config', id)
  }

  function trackPage(path: string, title: string) {
    if (import.meta.server) return
    window.gtag?.('event', 'page_view', { page_path: path, page_title: title })
  }

  function initPixel(pixelId?: string) {
    if (import.meta.server) return
    const id = pixelId || config.public.defaultPixel
    if (!id) return

    if (!window.fbq) {
      const stub = function fbq(...args: unknown[]) {
        const queue = (stub as unknown as { queue: unknown[] }).queue
        queue.push(args)
      }
      ;(stub as unknown as { queue: unknown[] }).queue = []
      window.fbq = stub
      window._fbq = stub
      loadScript('https://connect.facebook.net/en_US/fbevents.js', 'fb-pixel')
    }

    window.fbq('init', id)
    window.fbq('track', 'PageView')
  }

  function trackViewContent(input: {
    id: string
    name: string
    value: number
    currency: string
  }) {
    if (import.meta.server) return
    window.fbq?.('track', 'ViewContent', {
      content_ids: [input.id],
      content_name: input.name,
      content_type: 'product',
      value: input.value,
      currency: input.currency,
    })
  }

  function trackPurchase(input: {
    id: string
    value: number
    currency: string
  }) {
    if (import.meta.server) return
    window.fbq?.('track', 'Purchase', {
      content_ids: [input.id],
      value: input.value,
      currency: input.currency,
    })
  }

  return {
    getVisitorId,
    track,
    initGoogleAnalytics,
    trackPage,
    initPixel,
    trackViewContent,
    trackPurchase,
  }
}
