<script setup lang="ts">
import type { PackSize, Product, CreateOrderInput } from '~/types/store'

const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const packs: PackSize[] = [1, 2, 3]

const productId = computed(() => {
  const param = route.params.productId
  const raw = Array.isArray(param) ? param[0] : param
  return raw ? decodeURIComponent(raw) : ''
})

const { data: product, error: productError, refresh: refreshProduct } = await useFetch<Product>(
  () => `/api/products/${encodeURIComponent(productId.value)}`,
)

const { packPrice, packLabel, savingsPercent } = useCatalog()
const { formatMoney, formatCount, defaultDeliveryIso, tomorrowIso } = useFormat()
const { track, initPixel, trackViewContent, trackPurchase } = useTracking()
const { stripMarkdown } = useMarkdown()
const { getErrorMessage } = useApiError()

const pack = ref<PackSize>(1)
const quantity = ref(1)
const submitting = ref(false)
const error = ref('')
const formVisible = ref(true)
const formEl = ref<HTMLElement | null>(null)

// Check if we're using unit pricing (pack prices are 0, unit price is set)
const isUnitPricing = computed(() => {
  if (!product.value) return false
  return product.value.unitPrice > 0 && 
    product.value.pack1Price === 0 && 
    product.value.pack2Price === 0 && 
    product.value.pack3Price === 0
})

const form = reactive({
  customerName: '',
  primaryPhone: '',
  alternativePhone: '',
  deliveryAddress: '',
  city: '',
  deliveryDate: defaultDeliveryIso(),
})

const unit = computed(() => {
  if (!product.value) return 0
  if (isUnitPricing.value) return product.value.unitPrice
  return packPrice(product.value, pack.value)
})

const total = computed(() => {
  if (isUnitPricing.value) {
    return unit.value * quantity.value
  }
  // For pack pricing, quantity is always 1 (the pack itself is the quantity)
  return unit.value
})

const packageName = computed(() => {
  if (isUnitPricing.value) {
    return `${quantity.value} Unit${quantity.value > 1 ? 's' : ''}`
  }
  return packLabel(pack.value)
})

// Track product view
onMounted(() => {
  if (product.value) {
    track('product_view', { productId: product.value.productId })
    initPixel(product.value.metaPixel || undefined)
    trackViewContent({
      id: product.value.productId,
      name: product.value.productName,
      value: product.value.pack1Price,
      currency: product.value.currency,
    })
  }

  // Intersection observer for sticky button
  const observer = new IntersectionObserver(
    ([entry]) => {
      formVisible.value = Boolean(entry?.isIntersecting)
    },
    { threshold: 0.2 },
  )
  if (formEl.value) observer.observe(formEl.value)
  
  onUnmounted(() => observer.disconnect())
})

// SEO
if (product.value) {
  const description = product.value.shortDescription || stripMarkdown(product.value.description).slice(0, 160)
  useSeoMeta({
    title: product.value.productName,
    description,
    ogTitle: product.value.productName,
    ogDescription: description,
    ogImage: product.value.images[0],
    ogType: 'product',
  })
}

function money(amount: number) {
  return formatMoney(amount, product.value?.currency || 'KES')
}

function bump(delta: number) {
  quantity.value = Math.min(10, Math.max(1, quantity.value + delta))
}

function digits(value: string) {
  return value.replace(/[^\d+]/g, '')
}

async function placeOrder() {
  const item = product.value
  if (!item) return
  error.value = ''

  if (!form.customerName.trim() || !form.primaryPhone.trim() || !form.deliveryAddress.trim() || !form.city.trim()) {
    error.value = 'Name, phone, address, and city are required.'
    return
  }

  if (digits(form.primaryPhone).length < 9) {
    error.value = 'Enter a working primary phone number.'
    return
  }

  submitting.value = true
  
  try {
    const orderInput: CreateOrderInput = {
      customerName: form.customerName.trim(),
      primaryPhone: form.primaryPhone.trim(),
      alternativePhone: form.alternativePhone.trim() || undefined,
      deliveryAddress: form.deliveryAddress.trim(),
      city: form.city.trim(),
      productId: item.productId,
      package: packageName.value,
      quantity: isUnitPricing.value ? quantity.value : 1, // For packs, quantity is always 1
      deliveryDate: form.deliveryDate,
    }

    const order = await $fetch('/api/orders', {
      method: 'POST',
      body: orderInput,
    })

    // Store order for success page
    sessionStorage.setItem('ae.lastOrder', JSON.stringify(order))
    
    track('order_submitted', { productId: item.productId })
    trackPurchase({ id: item.productId, value: total.value, currency: item.currency })
    
    await router.push('/order/success')
  } catch (err) {
    error.value = getErrorMessage(err, 'Could not place the order. Please try again.')
  } finally {
    submitting.value = false
  }
}

function goToForm() {
  formEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// Track checkout interactions
function trackCheckoutOpen() {
  if (product.value) {
    track('checkout_open', { productId: product.value.productId })
  }
}

function trackFormStarted() {
  if (product.value) {
    track('form_started', { productId: product.value.productId })
  }
}

function trackFieldFilled(field: string) {
  if (product.value) {
    track('field_filled', { productId: product.value.productId, metadata: { field } })
  }
}
</script>

<template>
  <div v-if="productError && productError.statusCode !== 404" class="page missing">
    <ErrorState
      title="Could not load this product"
      :message="getErrorMessage(productError)"
      :retry="refreshProduct"
    >
      <NuxtLink to="/products">Back to the catalogue</NuxtLink>
    </ErrorState>
  </div>

  <div v-else-if="!product" class="page missing">
    <h1>This product is not listed.</h1>
    <NuxtLink to="/products">Back to the catalogue</NuxtLink>
  </div>

  <div v-else class="page">
    <nav class="crumbs">
      <NuxtLink to="/">Home</NuxtLink>
      <span>/</span>
      <NuxtLink to="/products">Products</NuxtLink>
      <span>/</span>
      <span>{{ product.productName }}</span>
    </nav>

    <div class="split">
      <div class="gallery-col">
        <ProductGallery :images="product.images || []" :name="product.productName" />
      </div>

      <div class="buy">
        <p class="cat">{{ product.category }}</p>
        <h1>{{ product.productName }}</h1>
        <p class="sold">{{ formatCount(product.soldCount) }} people have bought this</p>
        <p class="blurb">{{ product.shortDescription }}</p>

        <ul v-if="product.features?.length" class="features">
          <li v-for="feature in product.features" :key="feature">{{ feature }}</li>
        </ul>

        <!-- Pack selection for tiered pricing -->
        <fieldset v-if="!isUnitPricing" class="packs">
          <legend>Package</legend>
          <label v-for="size in packs" :key="size" :class="{ on: pack === size }">
            <input v-model="pack" type="radio" :value="size" />
            <strong class="pack-name">{{ packLabel(size) }}</strong>
            <span>{{ money(packPrice(product, size)) }}</span>
            <em v-if="savingsPercent(product, size)">Save {{ savingsPercent(product, size) }}%</em>
          </label>
        </fieldset>

        <!-- Quantity selector for unit pricing -->
        <div v-if="isUnitPricing" class="qty">
          <span>Quantity</span>
          <div class="stepper">
            <button type="button" aria-label="Decrease quantity" @click="bump(-1)">&minus;</button>
            <strong>{{ quantity }}</strong>
            <button type="button" aria-label="Increase quantity" @click="bump(1)">+</button>
          </div>
        </div>
        
        <p v-if="isUnitPricing" class="unit-price">{{ money(product.unitPrice) }} per unit</p>

        <p class="total">
          Total
          <strong>{{ money(total) }}</strong>
        </p>

        <form 
          id="order-form" 
          ref="formEl" 
          class="form" 
          @submit.prevent="placeOrder"
          @focusin.once="trackCheckoutOpen"
        >
          <h2>Place order</h2>
          <p class="autofill">{{ product.productName }} · {{ packageName }}</p>

          <label>
            Full name
            <input 
              v-model="form.customerName" 
              name="customerName" 
              autocomplete="name" 
              required 
              @input.once="trackFormStarted"
              @blur="trackFieldFilled('customerName')"
            />
          </label>
          <label>
            Primary phone
            <input 
              v-model="form.primaryPhone" 
              name="primaryPhone" 
              type="tel" 
              inputmode="tel" 
              autocomplete="tel" 
              required 
              @blur="trackFieldFilled('primaryPhone')"
            />
          </label>
          <label>
            Alternative phone
            <input 
              v-model="form.alternativePhone" 
              name="alternativePhone" 
              type="tel" 
              inputmode="tel" 
            />
          </label>
          <label>
            Delivery address
            <textarea 
              v-model="form.deliveryAddress" 
              name="deliveryAddress" 
              rows="3" 
              required 
              @blur="trackFieldFilled('deliveryAddress')"
            />
          </label>
          <label>
            City
            <input 
              v-model="form.city" 
              name="city" 
              autocomplete="address-level2" 
              required 
              @blur="trackFieldFilled('city')"
            />
          </label>
          <label>
            Preferred delivery date
            <input v-model="form.deliveryDate" name="deliveryDate" type="date" :min="tomorrowIso()" />
          </label>

          <p class="cod">Payment is done on delivery. You pay when the order arrives — not on this page.</p>
          <p v-if="error" class="error" role="alert">{{ error }}</p>
          <button class="btn primary wide" type="submit" :disabled="submitting">
            {{ submitting ? 'Placing order…' : 'Place order' }}
          </button>
        </form>
      </div>
    </div>

    <LongDescription
      v-if="product.description"
      :markdown="product.description"
      :images="product.images || []"
      :seed="product.productId"
      :product-name="product.productName"
    />

    <div v-if="!formVisible" class="sticky">
      <span>{{ money(total) }}</span>
      <button class="btn primary" type="button" @click="goToForm">Place order</button>
    </div>
  </div>
</template>

<style scoped>
.page {
  width: min(1180px, calc(100% - 32px));
  margin: 0 auto;
  padding: 28px 0 96px;
  display: grid;
  gap: 64px;
}

.missing {
  padding: 80px 0;
}

.crumbs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--muted);
}

.crumbs a {
  color: var(--muted);
  text-decoration: none;
}

.crumbs a:hover {
  color: var(--ink);
}

.split {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 48px;
  align-items: start;
}

.gallery-col {
  position: sticky;
  top: 88px;
}

.cat {
  display: block;
  width: 100%;
  text-align: left;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-size: 12px;
  color: var(--muted);
  margin: 0 0 8px;
}

h1 {
  font-family: var(--display);
  font-size: clamp(32px, 4vw, 48px);
  letter-spacing: -0.05em;
  line-height: 1;
  margin: 0 0 10px;
}

.sold {
  font-weight: 600;
  color: var(--good);
  margin: 0 0 12px;
}

.blurb {
  color: var(--text);
  max-width: 42ch;
  margin: 0 0 18px;
}

.features {
  list-style: none;
  padding: 0;
  margin: 0 0 22px;
  display: grid;
  gap: 6px;
}

.features li {
  padding-left: 18px;
  position: relative;
  font-size: 15px;
}

.features li::before {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ink);
  position: absolute;
  left: 0;
  top: 0.55em;
}

.packs {
  border: 0;
  padding: 0;
  margin: 0 0 18px;
  display: grid;
  gap: 8px;
}

.packs legend {
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 8px;
}

.packs label {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px 12px;
  align-items: center;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 14px;
  cursor: pointer;
  background: var(--bg-2);
  transition:
    border-color 160ms ease,
    background-color 160ms ease;
}

.packs label.on {
  border-color: var(--ink);
  background: var(--chip);
}

.packs input {
  grid-row: 1 / span 2;
}

.pack-name {
  text-align: left;
}

.packs span {
  font-weight: 600;
  text-align: right;
}

.packs em {
  grid-column: 2 / 4;
  font-style: normal;
  font-size: 12px;
  color: var(--good);
}

.qty {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.unit-price {
  font-size: 14px;
  color: var(--muted);
  margin: 0 0 12px;
}

.stepper {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 4px 8px;
}

.stepper button {
  width: 32px;
  height: 32px;
  border: 0;
  background: none;
  font-size: 20px;
  cursor: pointer;
}

.total {
  display: flex;
  justify-content: space-between;
  font-size: 18px;
  margin: 0 0 24px;
}

.total strong {
  font-family: var(--display);
  font-size: 28px;
  letter-spacing: -0.04em;
}

.form {
  display: grid;
  gap: 12px;
  padding: 20px;
  border-radius: 20px;
  background: var(--bg-2);
  border: 1px solid var(--line);
}

.form h2 {
  margin: 0;
  font-family: var(--display);
  letter-spacing: -0.04em;
}

.autofill {
  color: var(--muted);
  font-size: 14px;
  margin: 0 0 6px;
}

.form label {
  display: grid;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
}

.cod {
  font-size: 14px;
  color: var(--text);
  background: var(--chip);
  padding: 12px 14px;
  border-radius: 12px;
}

.error {
  color: #9f1d1d;
  font-size: 14px;
  margin: 0;
}

.wide {
  width: 100%;
}

.sticky {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  background: color-mix(in srgb, var(--bg) 92%, transparent);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--line);
  z-index: 30;
}

.sticky span {
  font-family: var(--display);
  font-size: 22px;
}

@media (max-width: 900px) {
  .split {
    grid-template-columns: 1fr;
    gap: 28px;
  }

  .gallery-col {
    position: static;
  }
}

@media (max-width: 520px) {
  .page {
    width: min(100% - 24px, 1180px);
    padding-top: 20px;
    gap: 40px;
  }

  .crumbs {
    gap: 5px;
    font-size: 12px;
  }

  .split {
    gap: 22px;
  }

  h1 {
    font-size: 34px;
    line-height: 1.08;
  }

  .packs label {
    grid-template-columns: auto minmax(0, 1fr) auto;
    padding: 12px;
  }

  .form {
    padding: 16px;
  }

  .sticky .btn {
    min-height: 44px;
  }
}
</style>
