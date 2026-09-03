<script setup lang="ts">
const config = useRuntimeConfig()

useSeoMeta({
  title: `Not found · ${config.public.siteName}`,
  description: 'That page is not here.',
})
</script>

<template>
  <div class="page">
    <h1>Nothing at this address.</h1>
    <NuxtLink to="/products">See the catalogue</NuxtLink>
  </div>
</template>

<style scoped>
.page {
  width: min(720px, calc(100% - 32px));
  margin: 0 auto;
  padding: 80px 0;
}

h1 {
  font-family: var(--display);
  letter-spacing: -0.05em;
  margin-bottom: 16px;
}
</style>
