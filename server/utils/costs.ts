import { and, eq, isNull } from 'drizzle-orm'
import { schema, useDb } from './db'

export const DELIVERY_RATES_KEY = 'delivery_rates'

export type DeliveryRate = {
  amount: number
  currency: string
}

export type DeliveryRates = Record<string, DeliveryRate>

export function parseDeliveryRates(value: unknown): DeliveryRates {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const rates: DeliveryRates = {}
  for (const [country, raw] of Object.entries(value as Record<string, unknown>)) {
    const name = country.trim()
    if (!name || !raw || typeof raw !== 'object' || Array.isArray(raw)) continue
    const amount = Math.round(Number((raw as { amount?: unknown }).amount))
    const currency = String((raw as { currency?: unknown }).currency || '').trim().toUpperCase()
    if (!Number.isFinite(amount) || amount < 0 || !currency) continue
    rates[name] = { amount, currency }
  }
  return rates
}

export async function getDeliveryRates(): Promise<DeliveryRates> {
  const db = useDb()
  const [row] = await db
    .select()
    .from(schema.siteSettings)
    .where(eq(schema.siteSettings.key, DELIVERY_RATES_KEY))
  return parseDeliveryRates(row?.value)
}

export async function saveDeliveryRates(rates: DeliveryRates) {
  const db = useDb()
  const [existing] = await db
    .select({ key: schema.siteSettings.key })
    .from(schema.siteSettings)
    .where(eq(schema.siteSettings.key, DELIVERY_RATES_KEY))

  if (existing) {
    await db
      .update(schema.siteSettings)
      .set({ value: rates, updatedAt: new Date() })
      .where(eq(schema.siteSettings.key, DELIVERY_RATES_KEY))
    return
  }

  await db.insert(schema.siteSettings).values({
    key: DELIVERY_RATES_KEY,
    value: rates,
  })
}

export function rateForCountry(rates: DeliveryRates, country: string | null | undefined) {
  if (!country) return null
  return rates[country] || null
}

export function effectiveDeliveryCost(
  stored: number | null | undefined,
  country: string | null | undefined,
  rates: DeliveryRates,
) {
  if (stored != null) return Number(stored) || 0
  return rateForCountry(rates, country)?.amount ?? 0
}

export async function applyRatesToEmptyOrders(rates: DeliveryRates) {
  const db = useDb()
  let updated = 0

  for (const [country, rate] of Object.entries(rates)) {
    const rows = await db
      .update(schema.orders)
      .set({
        deliveryCost: rate.amount,
        updatedAt: new Date(),
      })
      .where(and(
        eq(schema.orders.productCountry, country),
        isNull(schema.orders.deliveryCost),
      ))
      .returning({ orderId: schema.orders.orderId })
    updated += rows.length
  }

  return updated
}
