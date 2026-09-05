import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getDeliveryRates, rateForCountry } from '../../utils/costs'

const createOrderSchema = z.object({
  customerName: z.string().min(1),
  primaryPhone: z.string().min(9),
  alternativePhone: z.string().optional(),
  deliveryAddress: z.string().min(1),
  city: z.string().min(1),
  productId: z.string().min(1),
  package: z.string().min(1),
  quantity: z.number().int().positive(),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  keverdEventId: z.string().max(255).optional(),
  keverdVisitorId: z.string().max(255).optional(),
  keverdErrorStage: z.string().max(50).optional(),
  keverdError: z.string().max(500).optional(),
})

export default defineSafeEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = createOrderSchema.safeParse(body)
  
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid order data',
      data: parsed.error.flatten(),
    })
  }

  const db = useDb()
  
  // Get the product to calculate price
  const [product] = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.productId, parsed.data.productId))

  if (!product) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Product not found',
    })
  }

  // Calculate total price based on pack
  const packMatch = parsed.data.package.match(/(\d+)\s*pack/i)
  const packSize = packMatch ? parseInt(packMatch[1]) : 1
  let unitPrice: number
  
  if (packSize === 1) unitPrice = product.pack1Price
  else if (packSize === 2) unitPrice = product.pack2Price
  else unitPrice = product.pack3Price

  const totalPrice = unitPrice * parsed.data.quantity
  const orderId = generateOrderId()
  const countryRate = rateForCountry(await getDeliveryRates(), product.country)

  const check = await verifyOrderEvent(parsed.data.keverdEventId, {
    stage: parsed.data.keverdErrorStage,
    message: parsed.data.keverdError,
  })

  // Create the order
  const [order] = await db
    .insert(schema.orders)
    .values({
      orderId,
      customerName: parsed.data.customerName,
      primaryPhone: parsed.data.primaryPhone,
      alternativePhone: parsed.data.alternativePhone || null,
      deliveryAddress: parsed.data.deliveryAddress,
      city: parsed.data.city,
      productName: product.productName,
      productId: parsed.data.productId,
      productCountry: product.country,
      package: parsed.data.package,
      quantity: parsed.data.quantity,
      totalPrice,
      currency: product.currency,
      deliveryCost: countryRate?.amount ?? null,
      deliveryDate: parsed.data.deliveryDate,
      status: 'pending',
      keverdEventId: check.eventId || parsed.data.keverdEventId || null,
      keverdVisitorId: check.visitorId || parsed.data.keverdVisitorId || null,
      keverdAction: check.action || null,
      keverdRiskScore: check.riskScore ?? null,
      keverdTimesSeen: check.timesSeen ?? null,
      keverdErrorStage: check.errorStage,
      keverdError: check.error,
    })
    .returning()

  // Increment sold count on product
  await db
    .update(schema.products)
    .set({
      soldCount: sql`${schema.products.soldCount} + ${parsed.data.quantity}`,
      updatedAt: new Date(),
    })
    .where(eq(schema.products.productId, parsed.data.productId))

  const { deliveryCost: _deliveryCost, ...customerOrder } = order
  return customerOrder
})
