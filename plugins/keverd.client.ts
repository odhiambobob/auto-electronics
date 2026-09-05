import type { KeverdCheckoutEvent } from '~/composables/useKeverd'

function describeBrowserError(error: unknown): string {
  if (!error) return 'Unknown browser error'
  if (typeof error === 'string') return error.slice(0, 500)
  const e = error as { name?: string; message?: string }
  const parts = [e.name && e.name !== 'Error' ? e.name : '', e.message || String(error)].filter(Boolean)
  return parts.join(' · ').slice(0, 500)
}

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const publicKey = config.public.keverdPublicKey
  const route = useRoute()
  const keverdLast = useState<{ eventId?: string; visitorId?: string } | null>('keverdLast', () => null)

  function skipReason(): 'preview' | 'disabled' | null {
    if (!publicKey) return 'disabled'
    if (route.query.preview === '1') return 'preview'
    if (route.path.startsWith('/a/') || route.path === '/admin-login') return 'preview'
    if (window.self !== window.top) return 'preview'
    return null
  }

  function pickIds(data: {
    event_id?: string
    requestId?: string
    visitor_id?: string
    visitorId?: string
    fingerprint?: string
  }) {
    return {
      eventId: data.event_id || data.requestId,
      visitorId: data.visitor_id || data.visitorId || data.fingerprint,
    }
  }

  if (!skipReason()) {
    import('@keverdjs/agent')
      .then(async ({ Keverd }) => {
        if (!Keverd.isReady()) {
          Keverd.init(publicKey)
        }
        // Page-load collect is what creates a Keverd event. init() alone does not.
        const ids = pickIds(await Keverd.getVisitorData())
        if (ids.eventId || ids.visitorId) {
          keverdLast.value = ids
        }
      })
      .catch(() => {})
  }

  async function getCheckoutEvent(): Promise<KeverdCheckoutEvent | null> {
    const skip = skipReason()
    if (skip) return null

    try {
      const { Keverd } = await import('@keverdjs/agent')
      if (!Keverd.isReady()) {
        Keverd.init(publicKey)
      }

      const ids = pickIds(await Keverd.getVisitorData())

      if (!ids.eventId) {
        return {
          visitorId: ids.visitorId,
          errorStage: 'browser',
          error: 'Keverd.getVisitorData() returned no event id.',
        }
      }

      keverdLast.value = ids
      return ids
    } catch (error) {
      return {
        errorStage: 'browser',
        error: describeBrowserError(error),
      }
    }
  }

  return {
    provide: {
      getKeverdEvent: getCheckoutEvent,
    },
  }
})
