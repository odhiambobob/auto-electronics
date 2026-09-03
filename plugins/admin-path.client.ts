export default defineNuxtPlugin(async () => {
  const adminPath = useState<string>('adminPath')
  
  // If not already set (from SSR), try to fetch
  if (!adminPath.value) {
    try {
      const result = await $fetch('/api/admin/path')
      adminPath.value = result.path
    } catch {
      // Not authenticated, will be handled by middleware
    }
  }
})
