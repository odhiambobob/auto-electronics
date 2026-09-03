<script setup lang="ts">
const props = withDefaults(defineProps<{
  title?: string
  message?: string
  retry?: () => unknown
}>(), {
  title: 'Something went wrong',
  message: 'Please try again.',
})

const retrying = ref(false)

async function handleRetry() {
  if (!props.retry) return
  retrying.value = true
  try {
    await props.retry()
  } finally {
    retrying.value = false
  }
}
</script>

<template>
  <div class="error-state" role="alert">
    <p class="error-title">{{ title }}</p>
    <p class="error-message">{{ message }}</p>
    <button v-if="retry" class="btn primary" type="button" :disabled="retrying" @click="handleRetry">
      {{ retrying ? 'Retrying…' : 'Try again' }}
    </button>
    <slot />
  </div>
</template>

<style scoped>
.error-state {
  display: grid;
  gap: 8px;
  justify-items: start;
  padding: 32px 24px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--bg-2);
}

.error-title {
  margin: 0;
  font-weight: 700;
  color: var(--ink);
  font-size: 18px;
}

.error-message {
  margin: 0 0 8px;
  color: var(--muted);
  max-width: 52ch;
}

.btn {
  margin-top: 4px;
}
</style>
