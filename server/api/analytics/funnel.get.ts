import { sql, gte, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  // Require admin authentication
  await requireAdmin(event)
  
  const query = getQuery(event)
  const days = parseInt(query.days as string) || 7
  
  const db = useDb()
  
  // Calculate start date
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0, 0, 0, 0)

  // Get funnel data - count unique visitors at each stage
  const eventTypes = ['page_view', 'product_view', 'checkout_open', 'form_started', 'field_filled', 'order_submitted']
  
  const funnelData = await Promise.all(
    eventTypes.map(async (eventType) => {
      const [result] = await db
        .select({
          count: sql<number>`count(distinct ${schema.orderEvents.visitorId})`,
        })
        .from(schema.orderEvents)
        .where(
          sql`${schema.orderEvents.eventType} = ${eventType} AND ${schema.orderEvents.createdAt} >= ${startDate}`
        )
      
      return {
        eventType,
        count: Number(result.count),
      }
    })
  )

  // Calculate dropoff rates
  const funnel = funnelData.map((stage, index) => {
    const previousCount = index === 0 ? stage.count : funnelData[index - 1].count
    const dropoffRate = previousCount > 0 
      ? Math.round(((previousCount - stage.count) / previousCount) * 100) 
      : 0
    
    return {
      ...stage,
      dropoffRate,
      conversionRate: funnelData[0].count > 0 
        ? Math.round((stage.count / funnelData[0].count) * 100)
        : 0,
    }
  })

  // Get dropoff by product
  const dropoffByProduct = await db
    .select({
      productId: schema.orderEvents.productId,
      eventType: schema.orderEvents.eventType,
      count: sql<number>`count(distinct ${schema.orderEvents.visitorId})`,
    })
    .from(schema.orderEvents)
    .where(gte(schema.orderEvents.createdAt, startDate))
    .groupBy(schema.orderEvents.productId, schema.orderEvents.eventType)
    .orderBy(schema.orderEvents.productId)

  return {
    funnel,
    dropoffByProduct: dropoffByProduct.map(d => ({
      productId: d.productId,
      eventType: d.eventType,
      count: Number(d.count),
    })),
  }
})
