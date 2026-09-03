<script setup lang="ts">
const route = useRoute()
const { data: settings } = await useFetch('/api/settings', {
  default: () => ({} as Record<string, unknown>),
})
</script>

<template>
  <header class="header">
    <div class="header-inner">
      <NuxtLink class="logo" to="/">
        <img 
          v-if="settings?.logo" 
          :src="settings.logo" 
          alt="Logo" 
          class="logo-image"
        />
        <template v-else>
          <span class="logo-mark" aria-hidden="true">AE</span>
          <span class="logo-text">
            <b>Auto</b>
            Electronics
          </span>
        </template>
      </NuxtLink>
      <nav class="nav" aria-label="Primary">
        <NuxtLink to="/" :class="{ on: route.path === '/' }">Home</NuxtLink>
        <NuxtLink to="/products" :class="{ on: route.path === '/products' }">All products</NuxtLink>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 40;
  backdrop-filter: blur(16px);
  background: color-mix(in srgb, var(--bg) 86%, transparent);
  border-bottom: 1px solid var(--line);
}

.header-inner {
  width: min(1180px, calc(100% - 32px));
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 68px;
  gap: 16px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--ink);
}

.logo-image {
  height: 40px;
  width: auto;
  object-fit: contain;
}

.logo-mark {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  background: var(--ink);
  color: var(--bg);
  font-family: var(--display);
  font-weight: 800;
  font-size: 13px;
  letter-spacing: 0.04em;
  border-radius: 9px;
}

.logo-text {
  font-size: 14px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.logo-text b {
  display: block;
  color: var(--ink);
  font-family: var(--display);
  font-size: 15px;
  letter-spacing: -0.03em;
  text-transform: none;
  font-weight: 700;
  line-height: 1.1;
}

.nav {
  display: flex;
  gap: 6px;
}

.nav a {
  text-decoration: none;
  color: var(--muted);
  font-size: 14px;
  font-weight: 500;
  padding: 8px 12px;
  border-radius: 999px;
}

.nav a.on,
.nav a:hover {
  color: var(--ink);
  background: var(--chip);
}
</style>
