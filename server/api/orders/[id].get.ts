import { eq } from 'drizzle-orm'

export default defineSafeEventHandler(async (event) => {
  // Require admin authentication
  await requireAdmin(event)
  
  const orderId = getRouterParam(event, 'id')
  
  if (!orderId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Order ID is required',
    })
  }

  const db = useDb()
  
  const [order] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.orderId, orderId))

  if (!order) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Order not found',
    })
  }

  return order
})
