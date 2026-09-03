import { eq } from 'drizzle-orm'

export default defineSafeEventHandler(async (event) => {
  // Require admin authentication
  await requireAdmin(event)
  
  const productId = getRouterParam(event, 'id')
  
  if (!productId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Product ID is required',
    })
  }

  const db = useDb()
  
  // Admin can see ALL products, including inactive ones
  const [product] = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.productId, productId))

  if (!product) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Product not found',
    })
  }

  return product
})
