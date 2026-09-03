import { eq, sql, gte, lte, and, desc } from 'drizzle-orm'

export default defineSafeEventHandler(async (event) => {
  // Require admin authentication
  await requireAdmin(event)
  
  const query = getQuery(event)
  const days = parseInt(query.days as string) || 30
  
  const db = useDb()
  
  // Calculate start date
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0, 0, 0, 0)

  // Daily earnings (only delivered orders)
  const dailyEarnings = await db
    .select({
      date: sql<string>`date(${schema.orders.orderDate})`.as('date'),
      revenue: sql<number>`sum(${schema.orders.totalPrice})`.as('revenue'),
      orderCount: sql<number>`count(*)`.as('order_count'),
    })
    .from(schema.orders)
    .where(
      and(
        gte(schema.orders.orderDate, startDate),
        eq(schema.orders.status, 'delivered')
      )
    )
    .groupBy(sql`date(${schema.orders.orderDate})`)
    .orderBy(sql`date(${schema.orders.orderDate})`)

  // Top selling products
  const topProducts = await db
    .select({
      productId: schema.orders.productId,
      productName: schema.orders.productName,
      totalSold: sql<number>`sum(${schema.orders.quantity})`.as('total_sold'),
      revenue: sql<number>`sum(${schema.orders.totalPrice})`.as('revenue'),
    })
    .from(schema.orders)
    .where(eq(schema.orders.status, 'delivered'))
    .groupBy(schema.orders.productId, schema.orders.productName)
    .orderBy(desc(sql`sum(${schema.orders.quantity})`))
    .limit(5)

  // Revenue by city
  const revenueByCity = await db
    .select({
      city: schema.orders.city,
      revenue: sql<number>`sum(${schema.orders.totalPrice})`.as('revenue'),
      orderCount: sql<number>`count(*)`.as('order_count'),
    })
    .from(schema.orders)
    .where(eq(schema.orders.status, 'delivered'))
    .groupBy(schema.orders.city)
    .orderBy(desc(sql`sum(${schema.orders.totalPrice})`))
    .limit(10)

  // Revenue by country
  const revenueByCountry = await db
    .select({
      country: schema.orders.productCountry,
      currency: schema.orders.currency,
      revenue: sql<number>`sum(${schema.orders.totalPrice})`.as('revenue'),
      orderCount: sql<number>`count(*)`.as('order_count'),
    })
    .from(schema.orders)
    .where(eq(schema.orders.status, 'delivered'))
    .groupBy(schema.orders.productCountry, schema.orders.currency)
    .orderBy(desc(sql`sum(${schema.orders.totalPrice})`))

  return {
    dailyEarnings: dailyEarnings.map(d => ({
      date: d.date,
      revenue: Number(d.revenue),
      orderCount: Number(d.orderCount),
    })),
    topProducts: topProducts.map(p => ({
      productId: p.productId,
      productName: p.productName,
      totalSold: Number(p.totalSold),
      revenue: Number(p.revenue),
    })),
    revenueByCity: revenueByCity.map(c => ({
      city: c.city,
      revenue: Number(c.revenue),
      orderCount: Number(c.orderCount),
    })),
    revenueByCountry: revenueByCountry.map(c => ({
      country: c.country,
      currency: c.currency,
      revenue: Number(c.revenue),
      orderCount: Number(c.orderCount),
    })),
  }
})
