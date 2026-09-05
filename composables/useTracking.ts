import type { EventType } from '~/types/store'

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void
      queue: unknown[]
      push: unknown
      loaded: boolean
      version: string
    }
    _fbq?: unknown
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export function useTracking() {
  const config = useRuntimeConfig()
  const route = useRoute()
  const keverdLast = useState<{ eventId?: string; visitorId?: string } | null>('keverdLast', () => null)
  
  function getVisitorId(): string {
    if (import.meta.server) return ''
    
    let visitorId = localStorage.getItem('ae.visitorId')
    if (!visitorId) {
      visitorId = `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
      localStorage.setItem('ae.visitorId', visitorId)
    }
    return visitorId
  }

  async function track(
    eventType: EventType,
    data?: { productId?: string; metadata?: Record<string, unknown>; keepalive?: boolean },
  ) {
    if (import.meta.server) return

    const body = {
      visitorId: getVisitorId(),
      eventType,
      productId: data?.productId,
      path: route.path,
      keverdEventId: keverdLast.value?.eventId,
      keverdVisitorId: keverdLast.value?.visitorId,
      metadata: {
        path: route.path,
        ...data?.metadata,
      },
    }

    try {
      if (data?.keepalive && typeof navigator !== 'undefined') {
        const payload = JSON.stringify(body)
        const sent = navigator.sendBeacon?.(
          '/api/tracking',
          new Blob([payload], { type: 'application/json' }),
        )
        if (sent) return
        await fetch('/api/tracking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        })
        return
      }

      await $fetch('/api/tracking', {
        method: 'POST',
        body,
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

  function resolvePixelId(pixelId?: string | null) {
    return (pixelId || config.public.defaultPixel || '').trim()
  }

  // Official Meta Pixel bootstrap. A custom stub with window.fbq already set
  // makes fbevents.js bail out (`if (fbq) return`) and events never leave the browser.
  function initPixel(pixelId?: string | null, trackPageView = false) {
    if (import.meta.server) return
    const id = resolvePixelId(pixelId)
    if (!id) return

    if (!window.fbq) {
      const fbq = function (...args: unknown[]) {
        if (fbq.callMethod) {
          fbq.callMethod(...args)
        } else {
          fbq.queue.push(args)
        }
      } as NonNullable<Window['fbq']>
      fbq.push = fbq
      fbq.loaded = true
      fbq.version = '2.0'
      fbq.queue = []
      window.fbq = fbq
      window._fbq = fbq
      loadScript('https://connect.facebook.net/en_US/fbevents.js', 'fb-pixel')
    }

    window.fbq('init', id)

    if (trackPageView) {
      window.fbq('track', 'PageView')
    }
  }

  function trackMetaPurchase(pixelId?: string | null) {
    if (import.meta.server) return
    initPixel(pixelId, false)
    window.fbq?.('track', 'Purchase', {
      value: 500,
      currency: 'KES',
    })
  }

  function trackViewContent(input: {
    id: string
    name: string
    value: number
    currency: string
    pixelId?: string | null
  }) {
    if (import.meta.server) return
    initPixel(input.pixelId, false)
    window.fbq?.('track', 'ViewContent', {
      content_ids: [input.id],
      content_name: input.name,
      content_type: 'product',
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
    trackMetaPurchase,
    resolvePixelId,
  }
}
