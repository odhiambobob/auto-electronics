<script setup lang="ts">
const route = useRoute()
const { track } = useTracking()

onMounted(() => {
  track('page_view')
})

watch(() => route.path, () => {
  track('page_view')
})
</script>

<template>
  <div class="site">
    <a class="skip" href="#content">Skip to content</a>
    <AppHeader />
    <main id="content" class="site-main">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
