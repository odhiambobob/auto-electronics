import { eq } from 'drizzle-orm'

export const REPORT_CURRENCY = 'KES'
const CACHE_KEY = 'fx_rates_kes'
const TTL_MS = 12 * 60 * 60 * 1000

export type FxTable = {
  base: 'KES'
  rates: Record<string, number>
  fetchedAt: string
  source: string
}

type RateResponse = {
  result?: string
  base_code?: string
  rates?: Record<string, number>
}

let memory: FxTable | null = null

function isFresh(table: FxTable | null) {
  if (!table?.fetchedAt || !table.rates) return false
  const age = Date.now() - Date.parse(table.fetchedAt)
  return Number.isFinite(age) && age < TTL_MS
}

async function readStoredRates() {
  try {
    const db = useDb()
    const [row] = await db
      .select()
      .from(schema.siteSettings)
      .where(eq(schema.siteSettings.key, CACHE_KEY))
    const value = row?.value as FxTable | null
    return value?.rates ? value : null
  } catch {
    return null
  }
}

async function writeStoredRates(table: FxTable) {
  try {
    const db = useDb()
    const [existing] = await db
      .select({ key: schema.siteSettings.key })
      .from(schema.siteSettings)
      .where(eq(schema.siteSettings.key, CACHE_KEY))

    if (existing) {
      await db
        .update(schema.siteSettings)
        .set({ value: table, updatedAt: new Date() })
        .where(eq(schema.siteSettings.key, CACHE_KEY))
      return
    }

    await db.insert(schema.siteSettings).values({ key: CACHE_KEY, value: table })
  } catch (error) {
    console.error('[fx] could not persist rates', error)
  }
}

export async function getKesRates(): Promise<FxTable> {
  if (isFresh(memory)) return memory as FxTable

  const stored = await readStoredRates()
  if (isFresh(stored)) {
    memory = stored
    return stored as FxTable
  }

  try {
    const data = await $fetch<RateResponse>('https://open.er-api.com/v6/latest/KES', {
      timeout: 8000,
    })
    if (data.result === 'success' && data.rates && typeof data.rates.KES === 'number') {
      const table: FxTable = {
        base: 'KES',
        rates: data.rates,
        fetchedAt: new Date().toISOString(),
        source: 'open.er-api.com',
      }
      memory = table
      await writeStoredRates(table)
      return table
    }
  } catch (error) {
    console.error('[fx] rate fetch failed', error)
  }

  if (stored?.rates) {
    memory = stored
    return stored
  }

  return {
    base: 'KES',
    rates: { KES: 1 },
    fetchedAt: new Date().toISOString(),
    source: 'fallback',
  }
}

export function toKes(amount: number, currency: string | null | undefined, table: FxTable): number {
  const value = Number(amount || 0)
  if (!value) return 0
  const code = (currency || REPORT_CURRENCY).toUpperCase()
  if (code === REPORT_CURRENCY) return Math.round(value)

  const unitsPerKes = table.rates[code]
  if (!unitsPerKes || unitsPerKes <= 0) return 0
  return Math.round(value / unitsPerKes)
}

export function rateNote(table: FxTable) {
  const when = table.fetchedAt ? new Date(table.fetchedAt) : null
  const stamp = when && !Number.isNaN(when.getTime())
    ? when.toISOString().slice(0, 16).replace('T', ' ')
    : 'unknown'
  return `Converted to KES from ${table.source} · ${stamp} UTC`
}
