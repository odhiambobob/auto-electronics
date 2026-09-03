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
  
  // Check if product exists
  const [existing] = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.productId, productId))

  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Product not found',
    })
  }

  // Delete the product
  await db
    .delete(schema.products)
    .where(eq(schema.products.productId, productId))

  return { success: true, message: 'Product deleted' }
})
