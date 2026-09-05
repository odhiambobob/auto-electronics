import { sql, gte, and, desc, inArray } from 'drizzle-orm'
import { getDeliveryRates, rateForCountry } from '../../utils/costs'
import { getKesRates, rateNote, toKes } from '../../utils/fx'

const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const
const CONVERSION_EVENTS = ['page_view', 'form_started', 'order_submitted'] as const

function ymd(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function daysBetween(start: Date, end: Date) {
  const keys: string[] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    keys.push(ymd(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return keys
}

function num(value: unknown) {
  return Number(value || 0)
}

const orderCountry = sql<string>`coalesce(nullif(trim(${schema.orders.productCountry}), ''), 'Kenya')`

export default defineSafeEventHandler(async (event) => {
  await requireAdmin(event)

  const query = getQuery(event)
  const rawDays = String(query.days || '30')
  const days = rawDays === 'all' ? 3650 : Math.min(Math.max(parseInt(rawDays) || 30, 1), 3650)
  const db = useDb()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0, 0, 0, 0)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const chartStart = new Date()
  chartStart.setDate(chartStart.getDate() - Math.min(days, 90))
  chartStart.setHours(0, 0, 0, 0)
  const dayKeys = daysBetween(chartStart, today)

  const inPeriod = gte(schema.orders.orderDate, startDate)

  const startDay = ymd(startDate)

  const [fx, rates, statusRows, currencyRows, dailyRows, productRows, cityRows, countryRows, todayRow, conversionRows, deliveryRows, adRows] = await Promise.all([
    getKesRates(),
    getDeliveryRates(),
    db
      .select({
        status: schema.orders.status,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(schema.orders)
      .where(inPeriod)
      .groupBy(schema.orders.status),

    db
      .select({
        currency: schema.orders.currency,
        status: schema.orders.status,
        count: sql<number>`cast(count(*) as int)`,
        revenue: sql<number>`coalesce(sum(${schema.orders.totalPrice}), 0)`,
      })
      .from(schema.orders)
      .where(inPeriod)
      .groupBy(schema.orders.currency, schema.orders.status),

    db
      .select({
        date: sql<string>`to_char(${schema.orders.orderDate}, 'YYYY-MM-DD')`,
        status: schema.orders.status,
        currency: schema.orders.currency,
        count: sql<number>`cast(count(*) as int)`,
        revenue: sql<number>`coalesce(sum(${schema.orders.totalPrice}), 0)`,
      })
      .from(schema.orders)
      .where(inPeriod)
      .groupBy(sql`to_char(${schema.orders.orderDate}, 'YYYY-MM-DD')`, schema.orders.status, schema.orders.currency),

    db
      .select({
        productId: schema.orders.productId,
        productName: schema.orders.productName,
        currency: schema.orders.currency,
        orders: sql<number>`cast(count(*) as int)`,
        cancelled: sql<number>`cast(count(*) filter (where ${schema.orders.status} = 'cancelled') as int)`,
        delivered: sql<number>`cast(count(*) filter (where ${schema.orders.status} = 'delivered') as int)`,
        quantity: sql<number>`coalesce(sum(${schema.orders.quantity}) filter (where ${schema.orders.status} <> 'cancelled'), 0)`,
        booked: sql<number>`coalesce(sum(${schema.orders.totalPrice}) filter (where ${schema.orders.status} <> 'cancelled'), 0)`,
        collected: sql<number>`coalesce(sum(${schema.orders.totalPrice}) filter (where ${schema.orders.status} = 'delivered'), 0)`,
      })
      .from(schema.orders)
      .where(inPeriod)
      .groupBy(schema.orders.productId, schema.orders.productName, schema.orders.currency)
      .orderBy(desc(sql`count(*)`))
      .limit(8),

    db
      .select({
        city: schema.orders.city,
        country: orderCountry,
        currency: schema.orders.currency,
        orders: sql<number>`cast(count(*) as int)`,
        cancelled: sql<number>`cast(count(*) filter (where ${schema.orders.status} = 'cancelled') as int)`,
        delivered: sql<number>`cast(count(*) filter (where ${schema.orders.status} = 'delivered') as int)`,
        booked: sql<number>`coalesce(sum(${schema.orders.totalPrice}) filter (where ${schema.orders.status} <> 'cancelled'), 0)`,
        collected: sql<number>`coalesce(sum(${schema.orders.totalPrice}) filter (where ${schema.orders.status} = 'delivered'), 0)`,
      })
      .from(schema.orders)
      .where(inPeriod)
      .groupBy(schema.orders.city, orderCountry, schema.orders.currency)
      .orderBy(desc(sql`count(*)`))
      .limit(10),

    db
      .select({
        country: orderCountry,
        currency: schema.orders.currency,
        orders: sql<number>`cast(count(*) as int)`,
        pending: sql<number>`cast(count(*) filter (where ${schema.orders.status} = 'pending') as int)`,
        cancelled: sql<number>`cast(count(*) filter (where ${schema.orders.status} = 'cancelled') as int)`,
        delivered: sql<number>`cast(count(*) filter (where ${schema.orders.status} = 'delivered') as int)`,
        booked: sql<number>`coalesce(sum(${schema.orders.totalPrice}) filter (where ${schema.orders.status} <> 'cancelled'), 0)`,
        collected: sql<number>`coalesce(sum(${schema.orders.totalPrice}) filter (where ${schema.orders.status} = 'delivered'), 0)`,
        pendingValue: sql<number>`coalesce(sum(${schema.orders.totalPrice}) filter (where ${schema.orders.status} = 'pending'), 0)`,
      })
      .from(schema.orders)
      .where(inPeriod)
      .groupBy(orderCountry, schema.orders.currency)
      .orderBy(desc(sql`count(*)`)),

    db
      .select({
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(schema.orders)
      .where(gte(schema.orders.orderDate, today)),

    db
      .select({
        eventType: schema.orderEvents.eventType,
        count: sql<number>`cast(count(distinct coalesce(${schema.orderEvents.keverdVisitorId}, ${schema.orderEvents.visitorId})) as int)`,
      })
      .from(schema.orderEvents)
      .where(and(
        gte(schema.orderEvents.createdAt, startDate),
        inArray(schema.orderEvents.eventType, [...CONVERSION_EVENTS]),
      ))
      .groupBy(schema.orderEvents.eventType),

    db
      .select({
        date: sql<string>`to_char(${schema.orders.orderDate}, 'YYYY-MM-DD')`,
        country: orderCountry,
        currency: schema.orders.currency,
        productId: schema.orders.productId,
        stamped: sql<number>`coalesce(sum(${schema.orders.deliveryCost}) filter (where ${schema.orders.deliveryCost} is not null), 0)`,
        unset: sql<number>`cast(count(*) filter (where ${schema.orders.deliveryCost} is null) as int)`,
      })
      .from(schema.orders)
      .where(and(inPeriod, sql`${schema.orders.status} = 'delivered'`))
      .groupBy(
        sql`to_char(${schema.orders.orderDate}, 'YYYY-MM-DD')`,
        orderCountry,
        schema.orders.currency,
        schema.orders.productId,
      ),

    db
      .select({
        date: sql<string>`to_char(${schema.adSpends.spentOn}, 'YYYY-MM-DD')`,
        currency: schema.adSpends.currency,
        amount: sql<number>`coalesce(sum(${schema.adSpends.amount}), 0)`,
      })
      .from(schema.adSpends)
      .where(sql`${schema.adSpends.spentOn} >= ${startDay}`)
      .groupBy(sql`to_char(${schema.adSpends.spentOn}, 'YYYY-MM-DD')`, schema.adSpends.currency),
  ])

  const statusCounts = Object.fromEntries(STATUSES.map((status) => [status, 0])) as Record<typeof STATUSES[number], number>
  for (const row of statusRows) {
    if (row.status in statusCounts) statusCounts[row.status] = num(row.count)
  }

  const orders = Object.values(statusCounts).reduce((sum, count) => sum + count, 0)
  const cancelled = statusCounts.cancelled
  const delivered = statusCounts.delivered
  const pending = statusCounts.pending
  const inTransit = statusCounts.confirmed + statusCounts.shipped
  const booked = orders - cancelled

  const revenueByCurrency = [...new Map(currencyRows.map((row) => [row.currency, row.currency])).keys()].map((currency) => {
    const rows = currencyRows.filter((row) => row.currency === currency)
    const bookedRows = rows.filter((row) => row.status !== 'cancelled')
    const collectedRows = rows.filter((row) => row.status === 'delivered')
    const pendingRows = rows.filter((row) => row.status === 'pending')
    const booked = bookedRows.reduce((sum, row) => sum + num(row.revenue), 0)
    const collected = collectedRows.reduce((sum, row) => sum + num(row.revenue), 0)
    const pendingValue = pendingRows.reduce((sum, row) => sum + num(row.revenue), 0)
    return {
      currency,
      booked,
      collected,
      pending: pendingValue,
      bookedKes: toKes(booked, currency, fx),
      collectedKes: toKes(collected, currency, fx),
      pendingKes: toKes(pendingValue, currency, fx),
      orders: rows.reduce((sum, row) => sum + num(row.count), 0),
      delivered: collectedRows.reduce((sum, row) => sum + num(row.count), 0),
    }
  }).sort((a, b) => b.bookedKes - a.bookedKes)

  const kes = {
    booked: revenueByCurrency.reduce((sum, row) => sum + row.bookedKes, 0),
    collected: revenueByCurrency.reduce((sum, row) => sum + row.collectedKes, 0),
    pending: revenueByCurrency.reduce((sum, row) => sum + row.pendingKes, 0),
  }

  function deliveryKesFor(stamped: unknown, unset: unknown, country: string | null, currency: string | null) {
    const amount = num(stamped) + num(unset) * (rateForCountry(rates, country)?.amount ?? 0)
    return toKes(amount, currency || rateForCountry(rates, country)?.currency || 'KES', fx)
  }

  const productDeliveryKes = new Map<string, number>()
  const countryDeliveryKes = new Map<string, number>()
  let deliveryKes = 0
  const dailyLookup = new Map<string, { orders: number; delivered: number; cancelled: number; bookedKes: number; collectedKes: number; deliveryKes: number; adsKes: number }>()

  for (const row of deliveryRows) {
    const kesAmount = deliveryKesFor(row.stamped, row.unset, row.country, row.currency)
    deliveryKes += kesAmount
    productDeliveryKes.set(row.productId, (productDeliveryKes.get(row.productId) || 0) + kesAmount)
    const country = row.country || 'Unknown'
    countryDeliveryKes.set(country, (countryDeliveryKes.get(country) || 0) + kesAmount)
    const current = dailyLookup.get(row.date) || { orders: 0, delivered: 0, cancelled: 0, bookedKes: 0, collectedKes: 0, deliveryKes: 0, adsKes: 0 }
    current.deliveryKes += kesAmount
    dailyLookup.set(row.date, current)
  }

  let adsKes = 0
  for (const row of adRows) {
    const kesAmount = toKes(num(row.amount), row.currency, fx)
    adsKes += kesAmount
    const current = dailyLookup.get(row.date) || { orders: 0, delivered: 0, cancelled: 0, bookedKes: 0, collectedKes: 0, deliveryKes: 0, adsKes: 0 }
    current.adsKes += kesAmount
    dailyLookup.set(row.date, current)
  }

  for (const row of dailyRows) {
    const current = dailyLookup.get(row.date) || { orders: 0, delivered: 0, cancelled: 0, bookedKes: 0, collectedKes: 0, deliveryKes: 0, adsKes: 0 }
    current.orders += num(row.count)
    if (row.status === 'delivered') current.delivered += num(row.count)
    if (row.status === 'cancelled') current.cancelled += num(row.count)
    if (row.status !== 'cancelled') current.bookedKes += toKes(num(row.revenue), row.currency, fx)
    if (row.status === 'delivered') current.collectedKes += toKes(num(row.revenue), row.currency, fx)
    dailyLookup.set(row.date, current)
  }

  const daily = dayKeys.map((date) => {
    const row = dailyLookup.get(date) || { orders: 0, delivered: 0, cancelled: 0, bookedKes: 0, collectedKes: 0, deliveryKes: 0, adsKes: 0 }
    return {
      date,
      ...row,
      netKes: row.collectedKes - row.deliveryKes - row.adsKes,
    }
  })

  const conversionLookup = Object.fromEntries(
    conversionRows.map((row) => [row.eventType, num(row.count)]),
  )
  const visitors = conversionLookup.page_view || 0
  const formStarted = conversionLookup.form_started || 0
  const submitted = conversionLookup.order_submitted || 0

  return {
    days,
    totals: {
      orders,
      booked,
      pending,
      inTransit,
      delivered,
      cancelled,
      todayOrders: num(todayRow[0]?.count),
      cancelRate: orders ? Math.round((cancelled / orders) * 100) : 0,
      deliveryRate: booked ? Math.round((delivered / booked) * 100) : 0,
      bookedKes: kes.booked,
      collectedKes: kes.collected,
      pendingKes: kes.pending,
      deliveryKes,
      adsKes,
      netKes: kes.collected - deliveryKes - adsKes,
      roas: adsKes ? Math.round((kes.collected / adsKes) * 100) / 100 : null,
    },
    fx: {
      base: fx.base,
      source: fx.source,
      fetchedAt: fx.fetchedAt,
      note: rateNote(fx),
    },
    revenueByCurrency,
    daily,
    dailyEarnings: daily.map((row) => ({
      date: row.date,
      revenue: row.collectedKes,
      orderCount: row.orders,
    })),
    topProducts: productRows.map((row) => ({
      productId: row.productId,
      productName: row.productName,
      currency: row.currency,
      orders: num(row.orders),
      cancelled: num(row.cancelled),
      delivered: num(row.delivered),
      totalSold: num(row.quantity),
      booked: num(row.booked),
      collected: num(row.collected),
      bookedKes: toKes(num(row.booked), row.currency, fx),
      collectedKes: toKes(num(row.collected), row.currency, fx),
      deliveryKes: productDeliveryKes.get(row.productId) || 0,
      revenue: toKes(num(row.collected), row.currency, fx),
    })),
    revenueByCity: cityRows.map((row) => ({
      city: row.city,
      country: row.country,
      currency: row.currency,
      orders: num(row.orders),
      cancelled: num(row.cancelled),
      delivered: num(row.delivered),
      booked: num(row.booked),
      collected: num(row.collected),
      bookedKes: toKes(num(row.booked), row.currency, fx),
      collectedKes: toKes(num(row.collected), row.currency, fx),
      revenue: toKes(num(row.collected), row.currency, fx),
      orderCount: num(row.orders),
    })),
    revenueByCountry: countryRows.map((row) => ({
      country: row.country || 'Kenya',
      currency: row.currency,
      orders: num(row.orders),
      pending: num(row.pending),
      cancelled: num(row.cancelled),
      delivered: num(row.delivered),
      booked: num(row.booked),
      collected: num(row.collected),
      pendingValue: num(row.pendingValue),
      bookedKes: toKes(num(row.booked), row.currency, fx),
      collectedKes: toKes(num(row.collected), row.currency, fx),
      pendingKes: toKes(num(row.pendingValue), row.currency, fx),
      deliveryKes: countryDeliveryKes.get(row.country || 'Unknown') || 0,
      revenue: toKes(num(row.collected), row.currency, fx),
      orderCount: num(row.orders),
    })),
    conversion: {
      visitors,
      formStarted,
      orders: submitted,
      formRate: visitors ? Math.round((formStarted / visitors) * 100) : 0,
      orderRate: visitors ? Math.round((submitted / visitors) * 100) : 0,
    },
    status: STATUSES.map((status) => ({
      status,
      count: statusCounts[status],
    })),
  }
})
