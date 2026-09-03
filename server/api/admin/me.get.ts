export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)

  return {
    id: admin.id,
    email: admin.email,
    createdAt: admin.createdAt,
  }
})
