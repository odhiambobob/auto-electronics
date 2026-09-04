import { sql, gte, eq, and } from 'drizzle-orm'

const eventTypes = ['page_view', 'product_view', 'checkout_open', 'form_started', 'field_filled', 'order_submitted'] as const

export default defineSafeEventHandler(async (event) => {
  await requireAdmin(event)
  
  const query = getQuery(event)
  const days = parseInt(query.days as string) || 7
  
  const db = useDb()
  
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0, 0, 0, 0)

  const funnelData = await Promise.all(
    eventTypes.map(async (eventType) => {
      const rows = await db
        .select({
          count: sql<number>`cast(count(distinct ${schema.orderEvents.visitorId}) as int)`,
        })
        .from(schema.orderEvents)
        .where(and(
          eq(schema.orderEvents.eventType, eventType),
          gte(schema.orderEvents.createdAt, startDate),
        ))

      return {
        eventType,
        count: Number(rows[0]?.count ?? 0),
      }
    })
  )

  const funnel = funnelData.map((stage, index) => {
    const previousCount = index === 0 ? stage.count : funnelData[index - 1]?.count ?? 0
    const dropoffRate = previousCount > 0 
      ? Math.round(((previousCount - stage.count) / previousCount) * 100) 
      : 0
    
    return {
      ...stage,
      dropoffRate,
      conversionRate: funnelData[0]?.count
        ? Math.round((stage.count / funnelData[0].count) * 100)
        : 0,
    }
  })

  const dropoffByProduct = await db
    .select({
      productId: schema.orderEvents.productId,
      eventType: schema.orderEvents.eventType,
      count: sql<number>`cast(count(distinct ${schema.orderEvents.visitorId}) as int)`,
    })
    .from(schema.orderEvents)
    .where(gte(schema.orderEvents.createdAt, startDate))
    .groupBy(schema.orderEvents.productId, schema.orderEvents.eventType)
    .orderBy(schema.orderEvents.productId)

  return {
    funnel,
    dropoffByProduct: dropoffByProduct.map((row) => ({
      productId: row.productId,
      eventType: row.eventType,
      count: Number(row.count ?? 0),
    })),
  }
})
