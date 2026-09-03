import { eq } from 'drizzle-orm'
import { z } from 'zod'

const updateOrderSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']).optional(),
  notes: z.string().nullable().optional(),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

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

  const body = await readBody(event)
  const parsed = updateOrderSchema.safeParse(body)
  
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid update data',
      data: parsed.error.flatten(),
    })
  }

  const db = useDb()
  
  const [order] = await db
    .update(schema.orders)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(eq(schema.orders.orderId, orderId))
    .returning()

  if (!order) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Order not found',
    })
  }

  return order
})
