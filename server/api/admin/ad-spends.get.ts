import { desc, eq } from 'drizzle-orm'

export default defineSafeEventHandler(async (event) => {
  await requireAdmin(event)

  const query = getQuery(event)
  const productId = typeof query.productId === 'string' ? query.productId.trim() : ''
  const db = useDb()

  const filter = productId ? eq(schema.adSpends.productId, productId) : undefined

  const rows = await db
    .select({
      id: schema.adSpends.id,
      productId: schema.adSpends.productId,
      productName: schema.products.productName,
      amount: schema.adSpends.amount,
      currency: schema.adSpends.currency,
      spentOn: schema.adSpends.spentOn,
      note: schema.adSpends.note,
      createdAt: schema.adSpends.createdAt,
    })
    .from(schema.adSpends)
    .leftJoin(schema.products, eq(schema.products.productId, schema.adSpends.productId))
    .where(filter)
    .orderBy(desc(schema.adSpends.spentOn), desc(schema.adSpends.id))
    .limit(200)

  return {
    spends: rows.map((row) => ({
      ...row,
      productName: row.productName || row.productId,
    })),
  }
})
