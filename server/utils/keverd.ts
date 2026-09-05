import { Keverd, type VerifyResult } from '@keverdjs/node'
import type { KeverdDeviceProfile } from '../db/schema'

export type KeverdOrderCheck = {
  eventId: string | null
  visitorId: string | null
  action: string | null
  riskScore: number | null
  timesSeen: number | null
  errorStage: string | null
  error: string | null
  profile: KeverdDeviceProfile | null
}

function clip(text: string, max = 500): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  return cleaned.length > max ? `${cleaned.slice(0, max)}…` : cleaned
}

export function describeKeverdError(error: unknown): string {
  if (!error) return 'Unknown error'
  if (typeof error === 'string') return clip(error)

  const e = error as {
    message?: string
    code?: string | null
    statusCode?: number | null
    name?: string
    cause?: { message?: string }
  }

  const parts: string[] = []
  if (e.name && e.name !== 'Error') parts.push(e.name)
  if (e.message) parts.push(e.message)
  if (e.code) parts.push(`code ${e.code}`)
  if (e.statusCode) parts.push(`HTTP ${e.statusCode}`)
  if (e.cause?.message && e.cause.message !== e.message) parts.push(e.cause.message)

  return clip(parts.join(' · ') || String(error))
}

function toScore(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  return Math.round(value)
}

function readFlag(source: Record<string, unknown> | null | undefined, keys: string[]): boolean | null {
  if (!source) return null
  for (const key of keys) {
    let current: unknown = source
    for (const part of key.split('.')) {
      if (!current || typeof current !== 'object') {
        current = undefined
        break
      }
      current = (current as Record<string, unknown>)[part]
    }
    if (typeof current === 'boolean') return current
    if (typeof current === 'string' && /^(true|detected|yes)$/i.test(current)) return true
    if (current && typeof current === 'object') {
      const record = current as Record<string, unknown>
      if (typeof record.detected === 'boolean') return record.detected
      if (typeof record.value === 'boolean') return record.value
    }
  }
  return null
}

export function pickDeviceProfile(result: VerifyResult): KeverdDeviceProfile {
  const signals = {
    ...(result.signals || {}),
    ...(result.smart_signals || {}),
  } as Record<string, unknown>
  const ip = (result.ip_info || {}) as Record<string, unknown>
  const location = (result.location || {}) as Record<string, unknown>

  return {
    country: result.country_name || (typeof location.country_name === 'string' ? location.country_name : null),
    countryCode: result.country_code || (typeof ip.country_code === 'string' ? ip.country_code : null),
    pageUrl: result.page_url,
    timesSeen: typeof result.times_seen === 'number' ? result.times_seen : result.device_history?.times_seen ?? null,
    isNew: result.is_new ?? result.device_history?.is_new ?? null,
    firstSeen: result.first_seen ?? result.device_history?.first_seen ?? null,
    lastSeen: result.last_seen ?? result.device_history?.last_seen ?? null,
    uniqueIps: result.device_history?.unique_ip_count ?? null,
    uniqueCountries: result.device_history?.unique_country_count ?? null,
    action: result.action,
    riskScore: toScore(result.risk_score),
    incognito: readFlag(signals, ['incognito', 'privacy.incognito', 'privacySignals.incognito']),
    vpn: readFlag(signals, ['vpn', 'ip.vpn', 'ip_info.vpn']),
    proxy: readFlag(signals, ['proxy', 'ip.proxy', 'ip_info.proxy']),
    bot: readFlag(signals, ['bot', 'bot_detected', 'automation.bot']),
    reasons: Array.isArray(result.reason) ? result.reason.slice(0, 8) : [],
  }
}

export async function verifyOrderEvent(
  eventId?: string | null,
  clientError?: { stage?: string | null; message?: string | null },
): Promise<KeverdOrderCheck> {
  const config = useRuntimeConfig()
  const secretKey = config.keverdSecretKey || process.env.KEVERD_SECRET_KEY || process.env.NUXT_KEVERD_SECRET_KEY || ''
  const publicKey = config.public.keverdPublicKey

  const empty: KeverdOrderCheck = {
    eventId: eventId || null,
    visitorId: null,
    action: null,
    riskScore: null,
    timesSeen: null,
    errorStage: null,
    error: null,
    profile: null,
  }

  if (clientError?.message) {
    empty.errorStage = clientError.stage || 'browser'
    empty.error = clip(clientError.message)
  }

  if (!secretKey) {
    if (publicKey && eventId && !empty.error) {
      empty.errorStage = 'config'
      empty.error = 'KEVERD_SECRET_KEY is not set, so the server could not verify this device.'
    }
    return empty
  }

  if (!eventId) {
    if (!empty.error) {
      empty.errorStage = 'browser'
      empty.error = publicKey
        ? 'Checkout did not send a Keverd event id. The browser fingerprint likely failed or was skipped.'
        : 'NUXT_PUBLIC_KEVERD_PUBLIC_KEY is not set, so checkout could not fingerprint this device.'
    }
    return empty
  }

  try {
    const client = new Keverd({ secretKey, timeoutMs: 8000 })
    const result = await client.verify(eventId)

    return {
      eventId: result.event_id || eventId,
      visitorId: result.visitor_id,
      action: result.action,
      riskScore: toScore(result.risk_score),
      timesSeen: typeof result.times_seen === 'number' ? result.times_seen : result.device_history?.times_seen ?? null,
      errorStage: empty.errorStage,
      error: empty.error,
      profile: pickDeviceProfile(result),
    }
  } catch (error) {
    console.error('[Keverd] verify failed', error)
    return {
      ...empty,
      eventId,
      errorStage: 'verify',
      error: describeKeverdError(error),
    }
  }
}
