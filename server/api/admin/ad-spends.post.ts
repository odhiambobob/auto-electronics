import { eq } from 'drizzle-orm'
import { z } from 'zod'

const createSchema = z.object({
  productId: z.string().min(1),
  amount: z.number().int().positive(),
  currency: z.string().min(3).max(10),
  spentOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(500).optional(),
})

export default defineSafeEventHandler(async (event) => {
  await requireAdmin(event)

  const parsed = createSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid ad spend',
      data: parsed.error.flatten(),
    })
  }

  const db = useDb()
  const [product] = await db
    .select({ productId: schema.products.productId })
    .from(schema.products)
    .where(eq(schema.products.productId, parsed.data.productId))

  if (!product) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Product not found',
    })
  }

  const [spend] = await db
    .insert(schema.adSpends)
    .values({
      productId: parsed.data.productId,
      amount: parsed.data.amount,
      currency: parsed.data.currency.toUpperCase(),
      spentOn: parsed.data.spentOn,
      note: parsed.data.note?.trim() || null,
    })
    .returning()

  return spend
})
