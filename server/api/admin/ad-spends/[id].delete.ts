import { eq } from 'drizzle-orm'

export default defineSafeEventHandler(async (event) => {
  await requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Ad spend ID is required',
    })
  }

  const db = useDb()
  const [spend] = await db
    .delete(schema.adSpends)
    .where(eq(schema.adSpends.id, id))
    .returning({ id: schema.adSpends.id })

  if (!spend) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Ad spend not found',
    })
  }

  return { ok: true }
})
