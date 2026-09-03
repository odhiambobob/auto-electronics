import { eq } from 'drizzle-orm'
import { z } from 'zod'

const checkEmailSchema = z.object({
  email: z.string().email(),
})

export default defineSafeEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = checkEmailSchema.safeParse(body)
  
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid email',
    })
  }

  const config = useRuntimeConfig()
  const db = useDb()
  
  // Check if this email is the admin email
  if (parsed.data.email.toLowerCase() !== config.adminEmail.toLowerCase()) {
    throw createError({
      statusCode: 401,
      statusMessage: 'This email is not authorized for admin access',
    })
  }

  // Check if admin exists
  let [admin] = await db
    .select()
    .from(schema.admins)
    .where(eq(schema.admins.email, parsed.data.email.toLowerCase()))

  // Create admin if doesn't exist
  if (!admin) {
    [admin] = await db
      .insert(schema.admins)
      .values({
        email: parsed.data.email.toLowerCase(),
        isSetupComplete: false,
      })
      .returning()
  }

  return {
    email: admin.email,
    requiresSetup: !admin.isSetupComplete,
  }
})
