import { desc, eq, and, gte, lte, sql, inArray, or, ilike } from 'drizzle-orm'

function safeLike(value: string) {
  return `%${value.replace(/[%_]/g, '').trim()}%`
}

export default defineSafeEventHandler(async (event) => {
  // Require admin authentication
  await requireAdmin(event)
  
  const query = getQuery(event)
  const status = query.status as string | undefined
  const startDate = query.startDate as string | undefined
  const endDate = query.endDate as string | undefined
  const city = query.city as string | undefined
  const country = typeof query.country === 'string' ? query.country.trim() : ''
  const q = typeof query.q === 'string' ? query.q.replace(/[%_]/g, '').trim() : ''
  const page = parseInt(query.page as string) || 1
  const limit = Math.min(parseInt(query.limit as string) || 50, 2000)
  const offset = (page - 1) * limit

  const db = useDb()
  
  // Build conditions
  const conditions = []
  
  if (status) {
    conditions.push(eq(schema.orders.status, status as any))
  }
  
  if (startDate) {
    conditions.push(gte(schema.orders.orderDate, new Date(startDate)))
  }
  
  if (endDate) {
    conditions.push(lte(schema.orders.orderDate, new Date(endDate)))
  }
  
  if (city) {
    conditions.push(ilike(schema.orders.city, safeLike(city)))
  }

  if (country) {
    conditions.push(eq(schema.orders.productCountry, country))
  }

  if (q) {
    const pattern = safeLike(q)
    conditions.push(or(
      ilike(schema.orders.orderId, pattern),
      ilike(schema.orders.customerName, pattern),
      ilike(schema.orders.primaryPhone, pattern),
      ilike(schema.orders.productName, pattern),
      ilike(schema.orders.city, pattern),
    ))
  }

  // Get orders
  const orderList = await db
    .select()
    .from(schema.orders)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(schema.orders.createdAt))
    .limit(limit)
    .offset(offset)

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.orders)
    .where(conditions.length ? and(...conditions) : undefined)

  const visitorIds = [...new Set(orderList.map((order) => order.keverdVisitorId).filter((id): id is string => Boolean(id)))]
  const repeatCounts = new Map<string, number>()

  if (visitorIds.length) {
    const rows = await db
      .select({
        visitorId: schema.orders.keverdVisitorId,
        count: sql<number>`count(*)`,
      })
      .from(schema.orders)
      .where(inArray(schema.orders.keverdVisitorId, visitorIds))
      .groupBy(schema.orders.keverdVisitorId)

    for (const row of rows) {
      if (row.visitorId) repeatCounts.set(row.visitorId, Number(row.count))
    }
  }

  const countryRows = await db
    .select({
      country: schema.orders.productCountry,
    })
    .from(schema.orders)
    .groupBy(schema.orders.productCountry)

  return {
    orders: orderList.map((order) => ({
      ...order,
      keverdOrderCount: order.keverdVisitorId ? repeatCounts.get(order.keverdVisitorId) ?? 1 : 0,
    })),
    countries: countryRows
      .map((row) => row.country)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b)),
    pagination: {
      page,
      limit,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / limit),
    },
  }
})
