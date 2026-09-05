<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const adminPath = useState<string>('adminPath')

// Get the expected admin path from server
const { data: pathData, error: pathError } = await useFetch('/api/_admin-path', {
  server: true,
})

// Set admin path from server response
const serverAdminPath = pathData.value?.path
if (serverAdminPath) {
  adminPath.value = serverAdminPath
}

if (pathError.value && !serverAdminPath) {
  throw createError({
    statusCode: 503,
    statusMessage: 'Admin is temporarily unavailable. Please try again.',
  })
}

// Get the path parts from the URL
const pathParts = (route.params.path as string[]) || []
const urlAdminPath = pathParts[0] // First part should be the admin path

// Check if the URL matches the expected admin path
if (!serverAdminPath || urlAdminPath !== serverAdminPath) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Not Found',
  })
}

// Check authentication
const { data: adminData, error: authError } = await useFetch('/api/admin/me')

if (authError.value) {
  await navigateTo('/admin-login')
}

definePageMeta({
  layout: 'admin',
})

useSeoMeta({
  robots: 'noindex, nofollow',
  title: 'Admin Dashboard',
})

// Determine which admin page to show based on path after admin path
const subPath = pathParts.slice(1).join('/') // Remove the admin path prefix

const currentPage = computed(() => {
  if (subPath === '' || subPath === undefined) return 'dashboard'
  if (subPath === 'orders') return 'orders'
  if (subPath.startsWith('orders/')) return 'order-detail'
  if (subPath === 'products') return 'products'
  if (subPath === 'products/new') return 'product-new'
  if (subPath.startsWith('products/')) return 'product-edit'
  if (subPath === 'analytics') return 'analytics'
  if (subPath === 'analytics/funnel') return 'funnel'
  if (subPath === 'costs') return 'costs'
  if (subPath === 'settings') return 'settings'
  return 'not-found'
})

const orderId = computed(() => {
  if (currentPage.value === 'order-detail') {
    return pathParts[pathParts.length - 1]
  }
  return null
})

const productId = computed(() => {
  if (currentPage.value === 'product-edit') {
    return pathParts[pathParts.length - 1]
  }
  return null
})
</script>

<template>
  <div>
    <AdminDashboard v-if="currentPage === 'dashboard'" />
    <AdminOrders v-else-if="currentPage === 'orders'" />
    <AdminOrderDetail v-else-if="currentPage === 'order-detail'" :order-id="orderId!" />
    <AdminProducts v-else-if="currentPage === 'products'" />
    <AdminProductNew v-else-if="currentPage === 'product-new'" />
    <AdminProductEdit v-else-if="currentPage === 'product-edit'" :product-id="productId!" />
    <AdminAnalytics v-else-if="currentPage === 'analytics'" />
    <AdminFunnel v-else-if="currentPage === 'funnel'" />
    <AdminCosts v-else-if="currentPage === 'costs'" />
    <AdminSettings v-else-if="currentPage === 'settings'" />
    <div v-else class="not-found">
      <h1>Page not found</h1>
      <NuxtLink :to="`/a/${adminPath}`">Back to Dashboard</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  text-align: center;
  padding: 48px;
}
</style>
