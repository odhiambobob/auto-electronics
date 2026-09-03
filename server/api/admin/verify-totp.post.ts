import { eq } from 'drizzle-orm'
import { z } from 'zod'
import * as OTPAuth from 'otpauth'

const verifyTotpSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  isSetup: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = verifyTotpSchema.safeParse(body)
  
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request',
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

  if (!admin || !admin.totpSecret) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Admin not found or TOTP not configured',
    })
  }

  // Verify TOTP code
  const totp = new OTPAuth.TOTP({
    issuer: 'Auto Electronics Admin',
    label: admin.email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(admin.totpSecret),
  })

  const delta = totp.validate({ token: parsed.data.code, window: 1 })

  if (delta === null) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid code',
    })
  }

  // If this is setup verification, mark as complete
  if (parsed.data.isSetup && !admin.isSetupComplete) {
    await db
      .update(schema.admins)
      .set({ isSetupComplete: true })
      .where(eq(schema.admins.id, admin.id))
  }

  // Create session
  const sessionId = await createAdminSession(admin.id)
  setSessionCookie(event, sessionId)

  return {
    success: true,
    adminPath: config.adminPath,
  }
})
