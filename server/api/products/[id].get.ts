import { eq, and } from 'drizzle-orm'

export default defineSafeEventHandler(async (event) => {
  const productId = getRouterParam(event, 'id')
  
  if (!productId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Product ID is required',
    })
  }

  const db = useDb()
  
  const [product] = await db
    .select()
    .from(schema.products)
    .where(
      and(
        eq(schema.products.productId, productId),
        eq(schema.products.isActive, true)
      )
    )

  if (!product) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Product not found',
    })
  }

  return product
})
