<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<template>
  <footer class="footer">
    <div class="footer-inner">
      <div>
        <p class="brand">Auto Electronics</p>
        <p class="note">Pay on delivery. We confirm on WhatsApp after you place an order.</p>
      </div>
      <nav>
        <NuxtLink to="/">Home</NuxtLink>
        <NuxtLink to="/products">Catalogue</NuxtLink>
      </nav>
      <p class="copy">&copy; {{ year }} Auto Electronics</p>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  border-top: 1px solid var(--line);
  margin-top: 72px;
}

.footer-inner {
  width: min(1180px, calc(100% - 32px));
  margin: 0 auto;
  padding: 36px 0 48px;
  display: grid;
  gap: 16px;
}

.brand {
  font-family: var(--display);
  font-size: 18px;
  color: var(--ink);
  font-weight: 700;
}

.note,
.copy {
  color: var(--muted);
  font-size: 14px;
}

nav {
  display: flex;
  gap: 16px;
}

nav a {
  color: var(--ink);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
}

nav a:hover {
  text-decoration: underline;
}
</style>
