import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'

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
      deliveryDate: parsed.data.deliveryDate,
      status: 'pending',
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

  return order
})
