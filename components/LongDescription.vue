<script setup lang="ts">
const props = defineProps<{
  markdown: string
  images: string[]
  seed: string
  productName: string
}>()

const { interleaveDescription } = useMarkdown()

const blocks = computed(() =>
  interleaveDescription(props.markdown, props.images, props.seed, props.productName),
)
</script>

<template>
  <section class="long-read" aria-labelledby="details-heading">
    <h2 id="details-heading">Full details</h2>
    <template v-for="(block, index) in blocks" :key="index">
      <div v-if="block.type === 'md'" class="prose" v-html="block.html" />
      <figure v-else class="shot">
        <img :src="block.src" :alt="block.alt" width="1200" height="800" />
      </figure>
    </template>
  </section>
</template>

<style scoped>
.long-read {
  display: grid;
  gap: 28px;
  padding-top: 12px;
}

h2 {
  font-family: var(--display);
  font-size: 32px;
  letter-spacing: -0.05em;
  margin: 0;
}

.prose :deep(h2) {
  font-family: var(--display);
  font-size: 22px;
  letter-spacing: -0.04em;
  margin: 8px 0 10px;
}

.prose :deep(p),
.prose :deep(li) {
  color: var(--text);
  font-size: 17px;
  line-height: 1.65;
}

.prose :deep(ul) {
  padding-left: 1.15em;
  margin: 8px 0 0;
}

.prose :deep(p + p) {
  margin-top: 12px;
}

.shot {
  margin: 4px 0;
}

.shot img {
  width: 100%;
  border-radius: 20px;
  display: block;
  max-height: 520px;
  object-fit: cover;
}
</style>
