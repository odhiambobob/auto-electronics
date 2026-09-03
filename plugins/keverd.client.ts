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

  function skipReason(): 'preview' | 'disabled' | null {
    if (!publicKey) return 'disabled'
    if (route.query.preview === '1') return 'preview'
    if (route.path.startsWith('/a/') || route.path === '/admin-login') return 'preview'
    if (window.self !== window.top) return 'preview'
    return null
  }

  if (!skipReason()) {
    import('@keverdjs/agent')
      .then(async ({ Keverd }) => {
        if (!Keverd.isReady()) {
          Keverd.init(publicKey)
        }
        // Page-load collect is what creates a Keverd event. init() alone does not.
        await Keverd.getVisitorData()
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

      const data = await Keverd.getVisitorData()
      const eventId = data.event_id || data.requestId
      const visitorId = data.visitorId || data.fingerprint

      if (!eventId) {
        return {
          visitorId,
          errorStage: 'browser',
          error: 'Keverd.getVisitorData() returned no event id.',
        }
      }

      return { eventId, visitorId }
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
