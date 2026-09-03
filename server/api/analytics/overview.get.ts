import { eq, sql, gte, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  // Require admin authentication
  await requireAdmin(event)
  
  const db = useDb()
  
  // Total orders count
  const [{ totalOrders }] = await db
    .select({ totalOrders: sql<number>`count(*)` })
    .from(schema.orders)

  // Total revenue (only delivered orders)
  const [{ totalRevenue }] = await db
    .select({ totalRevenue: sql<number>`coalesce(sum(${schema.orders.totalPrice}), 0)` })
    .from(schema.orders)
    .where(eq(schema.orders.status, 'delivered'))

  // Pending orders count
  const [{ pendingOrders }] = await db
    .select({ pendingOrders: sql<number>`count(*)` })
    .from(schema.orders)
    .where(eq(schema.orders.status, 'pending'))

  // Today's orders
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const [{ todayOrders }] = await db
    .select({ todayOrders: sql<number>`count(*)` })
    .from(schema.orders)
    .where(gte(schema.orders.orderDate, today))

  return {
    totalOrders: Number(totalOrders),
    totalRevenue: Number(totalRevenue),
    pendingOrders: Number(pendingOrders),
    todayOrders: Number(todayOrders),
  }
})
