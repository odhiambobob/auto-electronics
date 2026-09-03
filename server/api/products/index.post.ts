import { z } from 'zod'

const createProductSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  shortDescription: z.string().min(1),
  description: z.string().min(1),
  images: z.array(z.string()).default([]),
  pack1Price: z.number().positive(),
  pack2Price: z.number().positive(),
  pack3Price: z.number().positive(),
  unitPrice: z.number().positive(),
  category: z.string().min(1),
  country: z.string().default('Kenya'),
  features: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  featured: z.boolean().default(false),
  metaPixel: z.string().optional(),
  currency: z.string().default('KES'),
})

export default defineEventHandler(async (event) => {
  // Require admin authentication
  await requireAdmin(event)
  
  const body = await readBody(event)
  const parsed = createProductSchema.safeParse(body)
  
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid product data',
      data: parsed.error.flatten(),
    })
  }

  const db = useDb()
  
  const [product] = await db
    .insert(schema.products)
    .values(parsed.data)
    .returning()

  return product
})
