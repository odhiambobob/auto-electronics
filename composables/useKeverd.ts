export type KeverdCheckoutEvent = {
  eventId?: string
  visitorId?: string
  errorStage?: string
  error?: string
}

export function keverdErrorWhere(stage?: string | null): string {
  if (stage === 'browser') return 'Checkout — browser fingerprint'
  if (stage === 'verify') return 'Order API — Keverd verify'
  if (stage === 'config') return 'Configuration'
  return stage || 'Unknown'
}

export function isKeverdRisky(action?: string | null, score?: number | null): boolean {
  if (action === 'block' || action === 'hard_challenge') return true
  return typeof score === 'number' && score >= 65
}

export function keverdDeviceLabel(order: {
  keverdVisitorId?: string | null
  keverdTimesSeen?: number | null
  keverdOrderCount?: number | null
  relatedOrders?: unknown[] | null
}): 'repeat' | 'new' | null {
  if (!order.keverdVisitorId) return null
  const localCount = order.keverdOrderCount ?? ((order.relatedOrders?.length || 0) + 1)
  if (localCount > 1 || (order.keverdTimesSeen || 0) > 1) return 'repeat'
  return 'new'
}

export function useKeverd() {
  async function getCheckoutEvent(): Promise<KeverdCheckoutEvent | null> {
    if (import.meta.server) return null

    try {
      return (await useNuxtApp().$getKeverdEvent?.()) ?? null
    } catch (error) {
      const e = error as { name?: string; message?: string }
      return {
        errorStage: 'browser',
        error: [e.name, e.message].filter(Boolean).join(' · ') || 'Failed to collect a Keverd event.',
      }
    }
  }

  return { getCheckoutEvent }
}
