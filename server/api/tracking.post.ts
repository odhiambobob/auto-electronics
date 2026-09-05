import { z } from 'zod'

const trackingSchema = z.object({
  visitorId: z.string().min(1),
  eventType: z.enum(['page_view', 'product_view', 'checkout_open', 'form_started', 'field_filled', 'order_submitted']),
  productId: z.string().optional(),
  path: z.string().max(255).optional(),
  keverdEventId: z.string().max(255).optional(),
  keverdVisitorId: z.string().max(255).optional(),
  metadata: z.record(z.unknown()).optional(),
})

export default defineSafeEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = trackingSchema.safeParse(body)
  
  if (!parsed.success) {
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
        path: parsed.data.path || null,
        keverdVisitorId: parsed.data.keverdVisitorId || null,
        keverdEventId: parsed.data.keverdEventId || null,
        metadata: parsed.data.metadata || null,
      })

    await recordVisitorActivity({
      visitorId: parsed.data.visitorId,
      eventType: parsed.data.eventType,
      productId: parsed.data.productId,
      path: parsed.data.path,
      keverdEventId: parsed.data.keverdEventId,
      keverdVisitorId: parsed.data.keverdVisitorId,
      metadata: parsed.data.metadata,
    })
  } catch (error) {
    console.error('[tracking]', error)
  }

  return { ok: true }
})
