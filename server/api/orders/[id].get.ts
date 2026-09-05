import { eq, and, ne, desc } from 'drizzle-orm'
import { effectiveDeliveryCost, getDeliveryRates, rateForCountry } from '../../utils/costs'

export default defineSafeEventHandler(async (event) => {
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

  let relatedOrders: {
    orderId: string
    customerName: string
    productName: string
    totalPrice: number
    currency: string
    orderDate: Date
    status: string
  }[] = []

  if (order.keverdVisitorId) {
    relatedOrders = await db
      .select({
        orderId: schema.orders.orderId,
        customerName: schema.orders.customerName,
        productName: schema.orders.productName,
        totalPrice: schema.orders.totalPrice,
        currency: schema.orders.currency,
        orderDate: schema.orders.orderDate,
        status: schema.orders.status,
      })
      .from(schema.orders)
      .where(and(
        eq(schema.orders.keverdVisitorId, order.keverdVisitorId),
        ne(schema.orders.orderId, order.orderId),
      ))
      .orderBy(desc(schema.orders.createdAt))
      .limit(20)
  }

  const rates = await getDeliveryRates()
  const countryRate = rateForCountry(rates, order.productCountry)

  return {
    ...order,
    defaultDeliveryCost: countryRate?.amount ?? null,
    effectiveDeliveryCost: effectiveDeliveryCost(order.deliveryCost, order.productCountry, rates),
    relatedOrders,
  }
})
