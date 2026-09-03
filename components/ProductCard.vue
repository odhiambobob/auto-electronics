<script setup lang="ts">
import type { Product } from '~/types/store'

defineProps<{ product: Product; large?: boolean }>()

const { formatMoney, formatCount } = useFormat()
</script>

<template>
  <NuxtLink class="card" :class="{ large }" :to="`/product/${product.productId}`">
    <div class="media">
      <img :src="product.images[0]" :alt="product.productName" width="640" height="640" />
    </div>
    <div class="body">
      <p class="cat">{{ product.category }}</p>
      <h3>{{ product.productName }}</h3>
      <p class="from">From {{ formatMoney(product.pack1Price, product.currency) }}</p>
      <p class="sold">{{ formatCount(product.soldCount) }} bought</p>
    </div>
  </NuxtLink>
</template>

<style scoped>
.card {
  display: grid;
  gap: 14px;
  text-decoration: none;
  color: inherit;
  min-width: 0;
}

.media {
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 18px;
  background: var(--chip);
}

.large .media {
  aspect-ratio: 4 / 3;
}

.media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.card:hover img {
  transform: scale(1.04);
}

.cat {
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  margin: 0;
}

h3 {
  margin: 4px 0 8px;
  font-family: var(--display);
  font-size: 22px;
  letter-spacing: -0.04em;
  color: var(--ink);
  line-height: 1.15;
}

.from {
  font-weight: 600;
  color: var(--ink);
}

.sold {
  font-size: 13px;
  color: var(--muted);
  margin-top: 4px;
}

.large h3 {
  font-size: 32px;
}

@media (max-width: 720px) {
  .large h3,
  h3 {
    font-size: 20px;
  }
}
</style>
