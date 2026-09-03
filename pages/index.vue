<script setup lang="ts">
const { data: products } = await useFetch('/api/products')
const featured = computed(() => products.value?.filter(p => p.featured) || [])
const hero = computed(() => featured.value[0])
const rest = computed(() => featured.value.slice(1))

const config = useRuntimeConfig()

useSeoMeta({
  title: config.public.siteName,
  description: 'Selected electronics with pack pricing. Place an order in one screen and pay when it arrives.',
  ogTitle: config.public.siteName,
  ogDescription: 'Selected electronics with pack pricing. Place an order in one screen and pay when it arrives.',
  ogImage: hero.value?.images[0],
})
</script>

<template>
  <div class="home">
    <section class="hero">
      <div class="copy">
        <p class="eyebrow">Pay on delivery</p>
        <h1>Electronics you can order in one sitting.</h1>
        <p class="lede">
          Pick a pack, leave an address, we bring it. No account. No payment until it is in your hands.
        </p>
        <div class="actions">
          <NuxtLink class="btn primary" to="/products">Browse the catalogue</NuxtLink>
          <NuxtLink v-if="hero" class="btn ghost" :to="`/product/${hero.productId}`">
            See {{ hero.productName }}
          </NuxtLink>
        </div>
      </div>
      <NuxtLink v-if="hero" class="hero-shot" :to="`/product/${hero.productId}`">
        <img :src="hero.images[0]" :alt="hero.productName" width="900" height="720" />
        <span>{{ hero.productName }}</span>
      </NuxtLink>
    </section>

    <section class="picks" aria-labelledby="picks-heading">
      <div class="picks-head">
        <h2 id="picks-heading">Selected now</h2>
        <NuxtLink to="/products">All products</NuxtLink>
      </div>
      <div class="bento">
        <ProductCard v-if="hero" :product="hero" large />
        <div class="stack">
          <ProductCard v-for="product in rest" :key="product.productId" :product="product" />
        </div>
      </div>
    </section>

    <section class="steps" aria-label="How ordering works">
      <article>
        <span>01</span>
        <h3>Choose a pack</h3>
        <p>One, two, or three. The price on the product page is what you pay.</p>
      </article>
      <article>
        <span>02</span>
        <h3>Leave a number</h3>
        <p>Name, phone, and where it should land. We confirm on WhatsApp.</p>
      </article>
      <article>
        <span>03</span>
        <h3>Pay on delivery</h3>
        <p>Nothing is taken up front. You pay when the order is in your hands.</p>
      </article>
    </section>
  </div>
</template>

<style scoped>
.home {
  width: min(1180px, calc(100% - 32px));
  margin: 0 auto;
  display: grid;
  gap: 88px;
  padding: 36px 0 24px;
}

.hero {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 40px;
  align-items: center;
}

.eyebrow {
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  margin: 0 0 12px;
}

h1 {
  font-family: var(--display);
  font-size: clamp(42px, 6vw, 72px);
  line-height: 0.95;
  letter-spacing: -0.06em;
  margin: 0 0 18px;
  color: var(--ink);
}

.lede {
  font-size: 18px;
  color: var(--text);
  max-width: 38ch;
  margin: 0 0 28px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.hero-shot {
  display: block;
  text-decoration: none;
  color: var(--ink);
}

.hero-shot img {
  width: 100%;
  aspect-ratio: 5 / 4;
  object-fit: cover;
  border-radius: 28px;
  background: var(--chip);
}

.hero-shot span {
  display: inline-block;
  margin-top: 10px;
  font-weight: 600;
  font-size: 14px;
}

.picks-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 24px;
}

h2 {
  font-family: var(--display);
  font-size: 36px;
  letter-spacing: -0.05em;
  margin: 0;
}

.picks-head a {
  color: var(--ink);
  font-weight: 600;
}

.bento {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 28px;
}

.stack {
  display: grid;
  gap: 24px;
}

.steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}

.steps article {
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: var(--bg-2);
}

.steps span {
  font-family: var(--display);
  color: var(--muted);
}

.steps h3 {
  margin: 12px 0 8px;
  font-size: 20px;
  letter-spacing: -0.03em;
}

.steps p {
  color: var(--text);
  font-size: 15px;
}

@media (max-width: 900px) {
  .hero,
  .bento,
  .steps {
    grid-template-columns: 1fr;
  }

  .home {
    gap: 56px;
    padding-top: 24px;
  }
}
</style>
