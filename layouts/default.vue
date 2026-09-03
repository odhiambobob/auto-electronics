<script setup lang="ts">
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
