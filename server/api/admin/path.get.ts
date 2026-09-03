export default defineSafeEventHandler(async (event) => {
  // This endpoint returns the admin path - only accessible to authenticated admins
  const admin = await requireAdmin(event)
  const config = useRuntimeConfig()

  return {
    path: config.adminPath,
  }
})
