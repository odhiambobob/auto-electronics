<script setup lang="ts">
import type { PackSize, Product } from '~/types/store'

const props = defineProps<{
  form: {
    productName: string
    shortDescription: string
    description: string
    images: string[]
    pack1Price: number
    pack2Price: number
    pack3Price: number
    unitPrice: number
    category: string
    features: string[]
    currency: string
  }
  liveSrc?: string
}>()

const { formatMoney } = useFormat()
const { packPrice, packLabel, savingsPercent } = useCatalog()

const emit = defineEmits<{
  expand: [wide: boolean]
}>()

const device = ref<'phone' | 'tablet' | 'desktop'>('phone')
const source = ref<'live' | 'saved'>('live')
const pack = ref<PackSize>(1)

watch(device, (value) => {
  emit('expand', value !== 'phone')
}, { immediate: true })

const sizes = {
  phone: { width: 390, height: 780, label: 'Phone' },
  tablet: { width: 768, height: 900, label: 'Tablet' },
  desktop: { width: 1100, height: 760, label: 'Desktop' },
}

const product = computed(() => ({
  productId: 'preview',
  productName: props.form.productName || 'Product name',
  shortDescription: props.form.shortDescription || 'Short description will appear here.',
  description: props.form.description,
  images: props.form.images,
  pack1Price: props.form.pack1Price,
  pack2Price: props.form.pack2Price,
  pack3Price: props.form.pack3Price,
  unitPrice: props.form.unitPrice,
  category: props.form.category || 'Category',
  country: 'Kenya',
  features: props.form.features,
  isActive: true,
  featured: false,
  soldCount: 0,
  metaPixel: null,
  currency: props.form.currency || 'KES',
  createdAt: new Date(),
  updatedAt: new Date(),
  id: 0,
} satisfies Product))

const isUnitPricing = computed(() => (
  product.value.unitPrice > 0
  && product.value.pack1Price === 0
  && product.value.pack2Price === 0
  && product.value.pack3Price === 0
))

const total = computed(() => (
  isUnitPricing.value ? product.value.unitPrice : packPrice(product.value, pack.value)
))

const frame = computed(() => sizes[device.value])
const showSaved = computed(() => Boolean(props.liveSrc) && source.value === 'saved')

watch(() => props.liveSrc, (src) => {
  if (!src && source.value === 'saved') source.value = 'live'
})
</script>

<template>
  <section class="preview-pane" :class="device">
    <div class="preview-bar">
      <div class="switch">
        <button type="button" :class="{ on: device === 'phone' }" @click="device = 'phone'">Phone</button>
        <button type="button" :class="{ on: device === 'tablet' }" @click="device = 'tablet'">Tablet</button>
        <button type="button" :class="{ on: device === 'desktop' }" @click="device = 'desktop'">Desktop</button>
      </div>
      <div v-if="liveSrc" class="switch">
        <button type="button" :class="{ on: source === 'live' }" @click="source = 'live'">As you type</button>
        <button type="button" :class="{ on: source === 'saved' }" @click="source = 'saved'">Saved page</button>
      </div>
    </div>

    <p class="hint">
      {{ frame.label }} at {{ frame.width }}×{{ frame.height }}. Changes show here as you type — no popup.
    </p>

    <div class="stage">
      <div class="frame" :style="{ width: `${frame.width}px`, height: `${frame.height}px` }">
        <iframe
          v-if="showSaved && liveSrc"
          :src="liveSrc"
          :title="`${frame.label} preview`"
        />
        <div v-else class="mock" :class="device">
          <header class="mock-header">
            <span>AE</span>
            <nav>Home · Products</nav>
          </header>
          <div class="mock-page">
            <p class="crumbs">Home / Products / {{ product.productName }}</p>
            <div class="split">
              <div class="gallery">
                <img v-if="product.images[0]" :src="product.images[0]" :alt="product.productName" />
                <div v-else class="placeholder">Add images to preview the gallery</div>
              </div>
              <div class="buy">
                <p class="cat">{{ product.category }}</p>
                <h2>{{ product.productName }}</h2>
                <p class="blurb">{{ product.shortDescription }}</p>
                <ul v-if="product.features.length" class="features">
                  <li v-for="feature in product.features" :key="feature">{{ feature }}</li>
                </ul>
                <div v-if="!isUnitPricing" class="packs">
                  <label v-for="size in [1, 2, 3] as PackSize[]" :key="size" :class="{ on: pack === size }">
                    <input v-model="pack" type="radio" :value="size" />
                    <strong>{{ packLabel(size) }}</strong>
                    <span>{{ formatMoney(packPrice(product, size), product.currency) }}</span>
                    <em v-if="savingsPercent(product, size)">Save {{ savingsPercent(product, size) }}%</em>
                  </label>
                </div>
                <p v-else class="total-line">{{ formatMoney(product.unitPrice, product.currency) }} per unit</p>
                <p class="total-line">Total <strong>{{ formatMoney(total, product.currency) }}</strong></p>
                <div class="order">
                  <h3>Place order</h3>
                  <span />
                  <span />
                  <span class="tall" />
                  <button type="button" disabled>Place order</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.preview-pane {
  display: grid;
  gap: 12px;
}

.preview-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: space-between;
}

.switch {
  display: flex;
  border: 1px solid var(--line);
  border-radius: 999px;
  overflow: hidden;
}

.switch button {
  border: 0;
  background: var(--bg);
  padding: 8px 12px;
  font-size: 13px;
  cursor: pointer;
}

.switch button.on {
  background: var(--ink);
  color: var(--bg);
}

.hint {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.stage {
  overflow: auto;
  padding: 8px 0 16px;
}

.frame {
  margin: 0 auto;
  background: #111;
  border-radius: 28px;
  padding: 12px;
  box-shadow: var(--shadow);
}

.frame iframe,
.mock {
  width: 100%;
  height: 100%;
  border: 0;
  border-radius: 18px;
  background: var(--bg);
}

.mock {
  overflow: auto;
  color: var(--text);
}

.mock-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--bg) 86%, transparent);
  position: sticky;
  top: 0;
}

.mock-header span {
  font-weight: 800;
  color: var(--ink);
}

.mock-header nav {
  color: var(--muted);
  font-size: 12px;
}

.mock-page {
  padding: 16px;
}

.crumbs,
.cat,
.blurb {
  color: var(--muted);
  font-size: 12px;
}

.split {
  display: grid;
  gap: 18px;
  margin-top: 12px;
}

.mock.desktop .split,
.mock.tablet .split {
  grid-template-columns: 1.05fr 0.95fr;
}

.gallery img,
.placeholder {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 16px;
  background: var(--chip);
}

.placeholder {
  display: grid;
  place-items: center;
  color: var(--muted);
  font-size: 13px;
  text-align: center;
  padding: 16px;
}

.cat {
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin: 0 0 6px;
}

h2 {
  margin: 0 0 8px;
  font-size: 28px;
  letter-spacing: -0.04em;
  line-height: 1.1;
}

.blurb {
  font-size: 14px;
  margin: 0 0 12px;
}

.features {
  list-style: none;
  padding: 0;
  margin: 0 0 14px;
  display: grid;
  gap: 4px;
  font-size: 13px;
}

.features li {
  padding-left: 14px;
  position: relative;
}

.features li::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 99px;
  background: var(--ink);
  position: absolute;
  left: 0;
  top: 0.45em;
}

.packs {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}

.packs label {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
}

.packs label.on {
  border-color: var(--ink);
}

.packs em {
  grid-column: 2;
  font-size: 12px;
  color: var(--good);
}

.total-line {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
  color: var(--ink);
}

.order {
  margin-top: 16px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--bg-2);
  display: grid;
  gap: 8px;
}

.order h3 {
  margin: 0;
  font-size: 16px;
}

.order span {
  height: 36px;
  border-radius: 8px;
  background: var(--chip);
}

.order span.tall {
  height: 64px;
}

.order button {
  min-height: 44px;
  border: 0;
  border-radius: 999px;
  background: var(--ink);
  color: var(--bg);
}
</style>
