import { eq } from 'drizzle-orm'
import { z } from 'zod'

const updateProductSchema = z.object({
  productName: z.string().min(1).optional(),
  shortDescription: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  images: z.array(z.string()).optional(),
  pack1Price: z.number().positive().optional(),
  pack2Price: z.number().positive().optional(),
  pack3Price: z.number().positive().optional(),
  unitPrice: z.number().positive().optional(),
  category: z.string().min(1).optional(),
  country: z.string().optional(),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  featured: z.boolean().optional(),
  metaPixel: z.string().nullable().optional(),
  currency: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  // Require admin authentication
  await requireAdmin(event)
  
  const productId = getRouterParam(event, 'id')
  
  if (!productId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Product ID is required',
    })
  }

  const body = await readBody(event)
  const parsed = updateProductSchema.safeParse(body)
  
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid product data',
      data: parsed.error.flatten(),
    })
  }

  const db = useDb()
  
  const [product] = await db
    .update(schema.products)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(eq(schema.products.productId, productId))
    .returning()

  if (!product) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Product not found',
    })
  }

  return product
})
