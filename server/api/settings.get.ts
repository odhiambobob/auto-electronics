import { eq } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const db = useDb()
  
  const settings = await db
    .select()
    .from(schema.siteSettings)

  // Convert to object
  const result: Record<string, unknown> = {}
  
  for (const setting of settings) {
    result[setting.key] = setting.value
  }

  return result
})
