import { z } from 'zod'

const trackingSchema = z.object({
  visitorId: z.string().min(1),
  eventType: z.enum(['page_view', 'product_view', 'checkout_open', 'form_started', 'field_filled', 'order_submitted']),
  productId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = trackingSchema.safeParse(body)
  
  if (!parsed.success) {
    // Silently ignore invalid tracking requests
    return { ok: true }
  }

  const db = useDb()
  
  try {
    await db
      .insert(schema.orderEvents)
      .values({
        visitorId: parsed.data.visitorId,
        eventType: parsed.data.eventType,
        productId: parsed.data.productId || null,
        metadata: parsed.data.metadata || null,
      })
  } catch {
    // Silently ignore tracking errors
  }

  return { ok: true }
})
