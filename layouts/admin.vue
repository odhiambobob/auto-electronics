<script setup lang="ts">
const adminPath = useState<string>('adminPath')
const route = useRoute()
const menuOpen = ref(false)

watch(() => route.fullPath, () => {
  menuOpen.value = false
})
</script>

<template>
  <div class="admin-layout" :class="{ 'menu-open': menuOpen }">
    <header class="admin-topbar">
      <button
        class="admin-menu-btn"
        type="button"
        :aria-expanded="menuOpen"
        aria-controls="admin-sidebar"
        @click="menuOpen = !menuOpen"
      >
        <span class="admin-menu-icon" aria-hidden="true">
          <i /><i /><i />
        </span>
        <span class="sr-only">{{ menuOpen ? 'Close menu' : 'Open menu' }}</span>
      </button>
      <span class="admin-topbar-title">AE Admin</span>
    </header>

    <div v-if="menuOpen" class="admin-backdrop" @click="menuOpen = false" />

    <aside id="admin-sidebar" class="admin-sidebar">
      <h1>AE Admin</h1>
      <nav class="admin-nav">
        <NuxtLink :to="`/a/${adminPath}`">Dashboard</NuxtLink>
        <NuxtLink :to="`/a/${adminPath}/orders`">Orders</NuxtLink>
        <NuxtLink :to="`/a/${adminPath}/products`">Products</NuxtLink>
        <NuxtLink :to="`/a/${adminPath}/analytics`">Analytics</NuxtLink>
        <NuxtLink :to="`/a/${adminPath}/costs`">Costs</NuxtLink>
        <NuxtLink :to="`/a/${adminPath}/settings`">Settings</NuxtLink>
      </nav>
    </aside>
    <div class="admin-content">
      <slot />
    </div>
  </div>
</template>
