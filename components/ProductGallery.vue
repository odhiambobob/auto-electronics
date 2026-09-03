<script setup lang="ts">
const props = defineProps<{ images: string[]; name: string }>()
const active = ref(0)

watch(
  () => props.images,
  () => {
    active.value = 0
  },
)

function select(index: number) {
  active.value = index
}

function shift(delta: number) {
  const total = props.images.length
  if (!total) return
  active.value = (active.value + delta + total) % total
}
</script>

<template>
  <div class="gallery">
    <div class="stage">
      <img
        :src="images[active]"
        :alt="`${name} photo ${active + 1}`"
        width="900"
        height="900"
      />
      <button v-if="images.length > 1" class="nav prev" type="button" aria-label="Previous image" @click="shift(-1)">
        &lsaquo;
      </button>
      <button v-if="images.length > 1" class="nav next" type="button" aria-label="Next image" @click="shift(1)">
        &rsaquo;
      </button>
    </div>
    <div v-if="images.length > 1" class="thumbs" role="list">
      <button
        v-for="(image, index) in images"
        :key="image"
        type="button"
        class="thumb"
        :class="{ on: index === active }"
        :aria-label="`Show image ${index + 1}`"
        @click="select(index)"
      >
        <img :src="image" alt="" width="96" height="96" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.gallery {
  display: grid;
  gap: 12px;
}

.stage {
  position: relative;
  aspect-ratio: 1;
  border-radius: 24px;
  overflow: hidden;
  background: var(--chip);
}

.stage img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 50%;
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  color: var(--ink);
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
}

.prev {
  left: 12px;
}

.next {
  right: 12px;
}

.thumbs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.thumb {
  flex: 0 0 72px;
  height: 72px;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  background: var(--chip);
}

.thumb.on {
  border-color: var(--ink);
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
