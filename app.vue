<script setup lang="ts">
useHead({
  titleTemplate: (title) => title ? `${title} · Auto Electronics` : 'Auto Electronics',
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
