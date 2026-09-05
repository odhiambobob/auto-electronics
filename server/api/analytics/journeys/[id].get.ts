import { desc, eq, or, inArray } from 'drizzle-orm'

export default defineSafeEventHandler(async (event) => {
  await requireAdmin(event)

  const visitorId = getRouterParam(event, 'id')
  if (!visitorId) {
    throw createError({ statusCode: 400, statusMessage: 'Visitor is required' })
  }

  const db = useDb()
  const matches = await db
    .select()
    .from(schema.visitorSnapshots)
    .where(or(
      eq(schema.visitorSnapshots.visitorId, visitorId),
      eq(schema.visitorSnapshots.keverdVisitorId, visitorId),
    ))

  const snapshot = matches.sort((a, b) => (
    new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime()
  ))[0] || null

  const siblings = snapshot?.keverdVisitorId
    ? await db
      .select()
      .from(schema.visitorSnapshots)
      .where(eq(schema.visitorSnapshots.keverdVisitorId, snapshot.keverdVisitorId))
    : snapshot ? [snapshot] : []

  const visitorIds = [...new Set(siblings.map((row) => row.visitorId).concat(visitorId))]
  const keverdId = snapshot?.keverdVisitorId

  const events = await db
    .select()
    .from(schema.orderEvents)
    .where(keverdId
      ? or(
        inArray(schema.orderEvents.visitorId, visitorIds),
        eq(schema.orderEvents.keverdVisitorId, keverdId),
      )
      : inArray(schema.orderEvents.visitorId, visitorIds),
    )
    .orderBy(desc(schema.orderEvents.createdAt))
    .limit(160)

  const productId = snapshot?.lastProductId
  const [product] = productId
    ? await db
      .select({
        productId: schema.products.productId,
        productName: schema.products.productName,
      })
      .from(schema.products)
      .where(eq(schema.products.productId, productId))
    : []

  return {
    snapshot,
    siblings,
    productName: product?.productName || null,
    events: events.reverse(),
  }
})
