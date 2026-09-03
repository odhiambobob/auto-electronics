import { desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  // Require admin authentication
  await requireAdmin(event)
  
  const db = useDb()
  
  // Get all products (including inactive)
  const productList = await db
    .select()
    .from(schema.products)
    .orderBy(desc(schema.products.createdAt))

  return productList
})
