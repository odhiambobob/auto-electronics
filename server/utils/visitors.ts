import { eq } from 'drizzle-orm'
import type { ClearedField, KeverdDeviceProfile } from '../db/schema'

const FORM_FIELDS = ['customerName', 'primaryPhone', 'alternativePhone', 'deliveryAddress', 'city', 'deliveryDate'] as const
const VERIFY_EVENTS = new Set(['checkout_open', 'form_started', 'field_filled', 'order_submitted'])

type FormField = typeof FORM_FIELDS[number]

type SnapshotPatch = {
  visitorId: string
  eventType: string
  productId?: string | null
  path?: string | null
  keverdEventId?: string | null
  keverdVisitorId?: string | null
  metadata?: Record<string, unknown> | null
}

function asString(value: unknown, max = 255): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.replace(/\s+/g, ' ').trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

export function isContactField(field?: string | null): field is FormField {
  return Boolean(field && FORM_FIELDS.includes(field as FormField))
}

export async function recordVisitorActivity(patch: SnapshotPatch) {
  const db = useDb()
  const now = new Date()
  const metadata = patch.metadata || {}
  const snapshot = (metadata.snapshot && typeof metadata.snapshot === 'object')
    ? metadata.snapshot as Record<string, unknown>
    : {}

  const [existing] = await db
    .select()
    .from(schema.visitorSnapshots)
    .where(eq(schema.visitorSnapshots.visitorId, patch.visitorId))

  const field = typeof metadata.field === 'string' ? metadata.field : null
  const touched = uniqueStrings([
    ...(existing?.touchedFields || []),
    field || '',
  ])

  let cleared = [...(existing?.clearedFields || [])] as ClearedField[]
  if (metadata.cleared && field) {
    const lastValue = asString(metadata.lastValue, 255) || asString(metadata.value, 255)
    if (lastValue) {
      cleared = [
        ...cleared.filter((item) => item.field !== field),
        { field, lastValue, at: now.toISOString() },
      ].slice(-12)
    }
  }

  const next = {
    visitorId: patch.visitorId,
    keverdVisitorId: patch.keverdVisitorId || existing?.keverdVisitorId || null,
    keverdEventId: patch.keverdEventId || existing?.keverdEventId || null,
    lastPath: patch.path || existing?.lastPath || null,
    lastProductId: patch.productId || existing?.lastProductId || null,
    lastEventType: patch.eventType,
    lastField: field || existing?.lastField || null,
    customerName: asString(snapshot.customerName || metadata.customerName, 255) || existing?.customerName || null,
    primaryPhone: asString(snapshot.primaryPhone || metadata.primaryPhone, 50) || existing?.primaryPhone || null,
    alternativePhone: asString(snapshot.alternativePhone || metadata.alternativePhone, 50) || existing?.alternativePhone || null,
    deliveryAddress: asString(snapshot.deliveryAddress || metadata.deliveryAddress, 500) || existing?.deliveryAddress || null,
    city: asString(snapshot.city || metadata.city, 100) || existing?.city || null,
    deliveryDate: asString(snapshot.deliveryDate || metadata.deliveryDate, 20) || existing?.deliveryDate || null,
    touchedFields: touched,
    clearedFields: cleared,
    converted: patch.eventType === 'order_submitted' ? true : existing?.converted || false,
    eventCount: (existing?.eventCount || 0) + 1,
    lastSeenAt: now,
  }

  if (isContactField(field) && !metadata.cleared) {
    const typed = asString(metadata.value, field === 'deliveryAddress' ? 500 : 255)
    if (typed) next[field] = typed
  }

  if (existing) {
    await db
      .update(schema.visitorSnapshots)
      .set(next)
      .where(eq(schema.visitorSnapshots.visitorId, patch.visitorId))
  } else {
    await db.insert(schema.visitorSnapshots).values({
      ...next,
      firstSeenAt: now,
    })
  }

  if (VERIFY_EVENTS.has(patch.eventType)) {
    await maybeAttachKeverdDevice(patch.visitorId, patch.keverdEventId || existing?.keverdEventId)
  }
}

async function maybeAttachKeverdDevice(visitorId: string, eventId?: string | null) {
  if (!eventId) return

  const db = useDb()
  const [snapshot] = await db
    .select()
    .from(schema.visitorSnapshots)
    .where(eq(schema.visitorSnapshots.visitorId, visitorId))

  const verifiedAt = snapshot?.keverdVerifiedAt ? new Date(snapshot.keverdVerifiedAt).getTime() : 0
  const fresh = Date.now() - verifiedAt < 24 * 60 * 60 * 1000
  if (snapshot?.keverdVisitorId && fresh) return

  const check = await verifyOrderEvent(eventId)
  if (!check.visitorId && !check.profile) return

  await db
    .update(schema.visitorSnapshots)
    .set({
      keverdVisitorId: check.visitorId || snapshot?.keverdVisitorId || null,
      keverdEventId: check.eventId || eventId,
      keverdVerifiedAt: new Date(),
      keverdCountry: check.profile?.country || snapshot?.keverdCountry || null,
      keverdAction: check.action || snapshot?.keverdAction || null,
      keverdRiskScore: check.riskScore ?? snapshot?.keverdRiskScore ?? null,
      keverdTimesSeen: check.timesSeen ?? snapshot?.keverdTimesSeen ?? null,
      keverdIsNew: check.profile?.isNew ?? snapshot?.keverdIsNew ?? null,
      keverdProfile: check.profile || snapshot?.keverdProfile || null,
    })
    .where(eq(schema.visitorSnapshots.visitorId, visitorId))

  if (check.visitorId) {
    await mergeSiblingContacts(check.visitorId, check.profile)
  }
}

async function mergeSiblingContacts(
  keverdVisitorId: string,
  profile: KeverdDeviceProfile | null,
) {
  const db = useDb()
  const siblings = await db
    .select()
    .from(schema.visitorSnapshots)
    .where(eq(schema.visitorSnapshots.keverdVisitorId, keverdVisitorId))

  const richest = siblings.sort((a, b) => {
    const score = (row: typeof a) =>
      [row.customerName, row.primaryPhone, row.city, row.deliveryAddress].filter(Boolean).length
    return score(b) - score(a)
  })[0]

  if (!richest) return

  for (const sibling of siblings) {
    await db
      .update(schema.visitorSnapshots)
      .set({
        customerName: sibling.customerName || richest.customerName,
        primaryPhone: sibling.primaryPhone || richest.primaryPhone,
        alternativePhone: sibling.alternativePhone || richest.alternativePhone,
        deliveryAddress: sibling.deliveryAddress || richest.deliveryAddress,
        city: sibling.city || richest.city,
        keverdProfile: sibling.keverdProfile || profile,
      })
      .where(eq(schema.visitorSnapshots.visitorId, sibling.visitorId))
  }
}
