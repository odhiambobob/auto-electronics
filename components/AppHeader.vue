<script setup lang="ts">
const route = useRoute()
const menuOpen = ref(false)
const { data: settings } = await useFetch('/api/settings', {
  default: () => ({} as Record<string, unknown>),
})

watch(() => route.fullPath, () => {
  menuOpen.value = false
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
      <button
        class="menu-btn"
        type="button"
        :aria-expanded="menuOpen"
        aria-controls="site-nav"
        @click="menuOpen = !menuOpen"
      >
        <span aria-hidden="true"><i /><i /><i /></span>
        <span class="sr-only">{{ menuOpen ? 'Close menu' : 'Open menu' }}</span>
      </button>
      <nav id="site-nav" class="nav" :class="{ open: menuOpen }" aria-label="Primary">
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

.menu-btn {
  display: none;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

@media (max-width: 720px) {
  .header-inner {
    flex-wrap: wrap;
  }

  .menu-btn {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--bg);
    cursor: pointer;
  }

  .menu-btn span[aria-hidden] {
    display: grid;
    gap: 5px;
  }

  .menu-btn i {
    display: block;
    width: 18px;
    height: 2px;
    background: var(--ink);
    border-radius: 99px;
  }

  .nav {
    display: none;
    width: 100%;
    flex-direction: column;
    padding-bottom: 12px;
  }

  .nav.open {
    display: flex;
  }
}
</style>
