import { eq } from 'drizzle-orm'
import { z } from 'zod'
import * as OTPAuth from 'otpauth'

const setupTotpSchema = z.object({
  email: z.string().email(),
})

export default defineSafeEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = setupTotpSchema.safeParse(body)
  
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
      statusMessage: 'Unauthorized',
    })
  }

  // Get admin
  const [admin] = await db
    .select()
    .from(schema.admins)
    .where(eq(schema.admins.email, parsed.data.email.toLowerCase()))

  if (!admin) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Admin not found',
    })
  }

  if (admin.isSetupComplete) {
    throw createError({
      statusCode: 400,
      statusMessage: 'TOTP already configured',
    })
  }

  // Generate new TOTP secret
  const secret = new OTPAuth.Secret({ size: 20 })
  
  // Create TOTP instance
  const totp = new OTPAuth.TOTP({
    issuer: 'Auto Electronics Admin',
    label: admin.email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  })

  // Save secret to database (but don't mark as complete yet)
  await db
    .update(schema.admins)
    .set({ totpSecret: secret.base32 })
    .where(eq(schema.admins.id, admin.id))

  // Return the OTP auth URL for QR code generation
  return {
    secret: secret.base32,
    otpauthUrl: totp.toString(),
  }
})
