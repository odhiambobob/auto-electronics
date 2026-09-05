import { sql, gte, desc } from 'drizzle-orm'
import { getDeliveryRates, rateForCountry } from '../../utils/costs'
import { getKesRates, rateNote, toKes } from '../../utils/fx'

function num(value: unknown) {
  return Number(value || 0)
}

export default defineSafeEventHandler(async (event) => {
  await requireAdmin(event)

  const days = parseInt(getQuery(event).days as string) || 30
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0, 0, 0, 0)
  const startDay = startDate.toISOString().slice(0, 10)

  const db = useDb()
  const [fx, rates, products, orderRows, adRows] = await Promise.all([
    getKesRates(),
    getDeliveryRates(),
    db
      .select({
        productId: schema.products.productId,
        productName: schema.products.productName,
        country: schema.products.country,
        currency: schema.products.currency,
      })
      .from(schema.products)
      .orderBy(desc(schema.products.soldCount)),
    db
      .select({
        productId: schema.orders.productId,
        productName: schema.orders.productName,
        country: schema.orders.productCountry,
        currency: schema.orders.currency,
        status: schema.orders.status,
        orders: sql<number>`cast(count(*) as int)`,
        collected: sql<number>`coalesce(sum(${schema.orders.totalPrice}) filter (where ${schema.orders.status} = 'delivered'), 0)`,
        stampedDelivery: sql<number>`coalesce(sum(${schema.orders.deliveryCost}) filter (where ${schema.orders.status} = 'delivered' and ${schema.orders.deliveryCost} is not null), 0)`,
        unsetDelivered: sql<number>`cast(count(*) filter (where ${schema.orders.status} = 'delivered' and ${schema.orders.deliveryCost} is null) as int)`,
      })
      .from(schema.orders)
      .where(gte(schema.orders.orderDate, startDate))
      .groupBy(
        schema.orders.productId,
        schema.orders.productName,
        schema.orders.productCountry,
        schema.orders.currency,
        schema.orders.status,
      ),
    db
      .select({
        productId: schema.adSpends.productId,
        currency: schema.adSpends.currency,
        amount: sql<number>`coalesce(sum(${schema.adSpends.amount}), 0)`,
      })
      .from(schema.adSpends)
      .where(sql`${schema.adSpends.spentOn} >= ${startDay}`)
      .groupBy(schema.adSpends.productId, schema.adSpends.currency),
  ])

  type ProductRow = {
    productId: string
    productName: string
    country: string
    currency: string
    orders: number
    delivered: number
    collected: number
    collectedKes: number
    delivery: number
    deliveryKes: number
    adsKes: number
  }

  const byProduct = new Map<string, ProductRow>()

  for (const product of products) {
    byProduct.set(product.productId, {
      productId: product.productId,
      productName: product.productName,
      country: product.country || 'Kenya',
      currency: product.currency || 'KES',
      orders: 0,
      delivered: 0,
      collected: 0,
      collectedKes: 0,
      delivery: 0,
      deliveryKes: 0,
      adsKes: 0,
    })
  }

  function rowFor(productId: string, fallback: { productName?: string; country?: string | null; currency?: string | null }) {
    const current = byProduct.get(productId) || {
      productId,
      productName: fallback.productName || productId,
      country: fallback.country || 'Kenya',
      currency: fallback.currency || 'KES',
      orders: 0,
      delivered: 0,
      collected: 0,
      collectedKes: 0,
      delivery: 0,
      deliveryKes: 0,
      adsKes: 0,
    }
    byProduct.set(productId, current)
    return current
  }

  for (const row of orderRows) {
    const current = rowFor(row.productId, row)
    current.orders += num(row.orders)
    if (row.status === 'delivered') {
      current.delivered += num(row.orders)
      current.collected += num(row.collected)
      current.collectedKes += toKes(num(row.collected), row.currency, fx)
      const delivery = num(row.stampedDelivery) + num(row.unsetDelivered) * (rateForCountry(rates, row.country)?.amount ?? 0)
      current.delivery += delivery
      const deliveryCurrency = row.currency || rateForCountry(rates, row.country)?.currency || 'KES'
      current.deliveryKes += toKes(delivery, deliveryCurrency, fx)
    }
  }

  for (const row of adRows) {
    const current = rowFor(row.productId, {})
    current.adsKes += toKes(num(row.amount), row.currency, fx)
  }

  const list = [...byProduct.values()]
    .map((row) => {
      const netKes = row.collectedKes - row.deliveryKes - row.adsKes
      return {
        ...row,
        netKes,
        roas: row.adsKes ? Math.round((row.collectedKes / row.adsKes) * 100) / 100 : null,
      }
    })
    .filter((row) => row.orders || row.adsKes || row.collectedKes)
    .sort((a, b) => b.collectedKes - a.collectedKes || b.adsKes - a.adsKes)

  const totals = list.reduce((sum, row) => ({
    collectedKes: sum.collectedKes + row.collectedKes,
    deliveryKes: sum.deliveryKes + row.deliveryKes,
    adsKes: sum.adsKes + row.adsKes,
    netKes: sum.netKes + row.netKes,
  }), { collectedKes: 0, deliveryKes: 0, adsKes: 0, netKes: 0 })

  return {
    days,
    totals: {
      ...totals,
      roas: totals.adsKes ? Math.round((totals.collectedKes / totals.adsKes) * 100) / 100 : null,
    },
    fx: {
      base: fx.base,
      source: fx.source,
      fetchedAt: fx.fetchedAt,
      note: rateNote(fx),
    },
    products: list,
  }
})
