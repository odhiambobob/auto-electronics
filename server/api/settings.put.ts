import { eq } from 'drizzle-orm'
import { z } from 'zod'

const updateSettingsSchema = z.record(z.unknown())

export default defineSafeEventHandler(async (event) => {
  // Require admin authentication
  await requireAdmin(event)
  
  const body = await readBody(event)
  const parsed = updateSettingsSchema.safeParse(body)
  
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid settings data',
    })
  }

  const db = useDb()
  
  // Upsert each setting
  for (const [key, value] of Object.entries(parsed.data)) {
    const [existing] = await db
      .select()
      .from(schema.siteSettings)
      .where(eq(schema.siteSettings.key, key))

    if (existing) {
      await db
        .update(schema.siteSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(schema.siteSettings.key, key))
    } else {
      await db
        .insert(schema.siteSettings)
        .values({ key, value })
    }
  }

  // Return updated settings
  const settings = await db.select().from(schema.siteSettings)
  const result: Record<string, unknown> = {}
  
  for (const setting of settings) {
    result[setting.key] = setting.value
  }

  return result
})
