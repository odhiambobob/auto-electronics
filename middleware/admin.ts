export default defineNuxtRouteMiddleware(async (to) => {
  // Check if user is authenticated
  try {
    await $fetch('/api/admin/me')
  } catch {
    // Redirect to login
    return navigateTo('/admin-login')
  }
})
