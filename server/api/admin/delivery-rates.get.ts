import { sql } from 'drizzle-orm'
import { getDeliveryRates, rateForCountry } from '../../utils/costs'

export default defineSafeEventHandler(async (event) => {
  await requireAdmin(event)

  const db = useDb()
  const [rates, countryRows] = await Promise.all([
    getDeliveryRates(),
    db
      .select({
        country: schema.orders.productCountry,
        currency: schema.orders.currency,
        orders: sql<number>`cast(count(*) as int)`,
        unset: sql<number>`cast(count(*) filter (where ${schema.orders.deliveryCost} is null) as int)`,
      })
      .from(schema.orders)
      .groupBy(schema.orders.productCountry, schema.orders.currency),
  ])

  const products = await db
    .select({
      country: schema.products.country,
      currency: schema.products.currency,
    })
    .from(schema.products)

  const countries = new Map<string, { country: string; currency: string; orders: number; unset: number }>()

  for (const country of ['Kenya', 'Zambia', ...Object.keys(rates)]) {
    if (!countries.has(country)) {
      countries.set(country, {
        country,
        currency: rateForCountry(rates, country)?.currency || 'KES',
        orders: 0,
        unset: 0,
      })
    }
  }

  for (const row of products) {
    const country = row.country || 'Kenya'
    const current = countries.get(country) || {
      country,
      currency: row.currency || 'KES',
      orders: 0,
      unset: 0,
    }
    if (!rateForCountry(rates, country)) current.currency = row.currency || current.currency
    countries.set(country, current)
  }

  for (const row of countryRows) {
    const country = row.country || 'Kenya'
    const current = countries.get(country) || {
      country,
      currency: row.currency || 'KES',
      orders: 0,
      unset: 0,
    }
    current.orders += Number(row.orders || 0)
    current.unset += Number(row.unset || 0)
    if (!rateForCountry(rates, country)) current.currency = row.currency || current.currency
    countries.set(country, current)
  }

  return {
    rates,
    countries: [...countries.values()].sort((a, b) => b.orders - a.orders || a.country.localeCompare(b.country)),
  }
})
