<script setup lang="ts">
const error = useError()
const config = useRuntimeConfig()

const isNotFound = computed(() => error.value?.statusCode === 404)
const title = computed(() => isNotFound.value ? 'Nothing at this address' : 'Something went wrong')
const message = computed(() => {
  if (isNotFound.value) return 'That page is not here. You can go back to the catalogue.'
  return getErrorMessage(error.value, 'An unexpected error occurred. Please try again.')
})

useSeoMeta({
  title: `${title.value} · ${config.public.siteName}`,
  robots: 'noindex, nofollow',
})

function goHome() {
  clearError({ redirect: '/' })
}

function retry() {
  clearError()
}
</script>

<template>
  <div class="error-page">
    <p class="code">{{ error?.statusCode || 500 }}</p>
    <h1>{{ title }}</h1>
    <p class="lede">{{ message }}</p>
    <div class="actions">
      <button class="btn primary" type="button" @click="goHome">Back to home</button>
      <button v-if="!isNotFound" class="btn ghost" type="button" @click="retry">Try again</button>
    </div>
  </div>
</template>

<style scoped>
.error-page {
  min-height: 100svh;
  display: grid;
  align-content: center;
  width: min(720px, calc(100% - 32px));
  margin: 0 auto;
  padding: 80px 0;
}

.code {
  font-size: 13px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  margin: 0 0 8px;
}

h1 {
  font-family: var(--display);
  letter-spacing: -0.05em;
  margin: 0 0 12px;
}

.lede {
  color: var(--text);
  max-width: 46ch;
  margin: 0 0 24px;
}

.actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
</style>
