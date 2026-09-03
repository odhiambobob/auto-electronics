<script setup lang="ts">
const config = useRuntimeConfig()
const adminPath = useState<string>('adminPath')
</script>

<template>
  <div class="admin-layout">
    <aside class="admin-sidebar">
      <h1>AE Admin</h1>
      <nav class="admin-nav">
        <NuxtLink :to="`/a/${adminPath}`">Dashboard</NuxtLink>
        <NuxtLink :to="`/a/${adminPath}/orders`">Orders</NuxtLink>
        <NuxtLink :to="`/a/${adminPath}/products`">Products</NuxtLink>
        <NuxtLink :to="`/a/${adminPath}/analytics`">Analytics</NuxtLink>
        <NuxtLink :to="`/a/${adminPath}/settings`">Settings</NuxtLink>
      </nav>
    </aside>
    <div class="admin-content">
      <slot />
    </div>
  </div>
</template>
