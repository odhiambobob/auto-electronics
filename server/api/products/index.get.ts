import { eq } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const db = useDb()
  
  const productList = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.isActive, true))
    .orderBy(schema.products.soldCount)

  return productList
})
