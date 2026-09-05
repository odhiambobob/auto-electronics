<script setup lang="ts">
import type { Product } from '~/types/store'

const router = useRouter()
const { formatMoney, formatCount } = useFormat()
const { getCountryFlag } = useCountries()
const adminPath = useState<string>('adminPath')

const { data: products, error: productsError, refresh } = await useFetch('/api/admin/products')

const search = ref('')
const filterCountry = ref('')
const filterStatus = ref('')
const duplicating = ref<string | null>(null)
const deleting = ref<string | null>(null)
const showDeleteConfirm = ref<Product | null>(null)
const openMenu = ref<string | null>(null)
const actionError = ref('')
const { getErrorMessage } = useApiError()

const countries = computed(() => {
  const countrySet = new Set<string>()
  for (const product of products.value || []) {
    if (product.country) countrySet.add(product.country)
  }
  return [...countrySet].sort()
})

const countryOptions = computed(() => [
  { value: '', label: 'All markets' },
  ...countries.value.map((country) => ({ value: country, label: `${getCountryFlag(country)} ${country}` })),
])

const filteredProducts = computed(() => {
  const list = (products.value || []) as Product[]
  const query = search.value.trim().toLowerCase()

  return list.filter((product) => {
    if (filterCountry.value && (product.country || 'Kenya') !== filterCountry.value) return false
    if (filterStatus.value === 'live' && !product.isActive) return false
    if (filterStatus.value === 'hidden' && product.isActive) return false
    if (!query) return true
    return [product.productName, product.productId, product.category, product.country]
      .some((value) => value?.toLowerCase().includes(query))
  })
})

const liveCount = computed(() => ((products.value || []) as Product[]).filter((product) => product.isActive).length)

function closeMenu() {
  openMenu.value = null
}

function toggleMenu(event: Event, productId: string) {
  event.stopPropagation()
  openMenu.value = openMenu.value === productId ? null : productId
}

onMounted(() => document.addEventListener('click', closeMenu))
onBeforeUnmount(() => document.removeEventListener('click', closeMenu))

async function toggleActive(product: Product) {
  actionError.value = ''
  try {
    await $fetch(`/api/products/${product.productId}`, {
      method: 'PUT',
      body: { isActive: !product.isActive },
    })
    await refresh()
  } catch (err) {
    actionError.value = getErrorMessage(err, 'Could not update whether this product is live')
  }
}

async function toggleFeatured(product: Product) {
  actionError.value = ''
  try {
    await $fetch(`/api/products/${product.productId}`, {
      method: 'PUT',
      body: { featured: !product.featured },
    })
    await refresh()
  } catch (err) {
    actionError.value = getErrorMessage(err, 'Could not update featured status')
  }
}

async function duplicateProduct(product: Product) {
  closeMenu()
  duplicating.value = product.productId
  actionError.value = ''

  try {
    let newProductId = `${product.productId}-copy`
    const existingIds = ((products.value || []) as Product[]).map((item) => item.productId)
    let copyNum = 1
    while (existingIds.includes(newProductId)) {
      copyNum++
      newProductId = `${product.productId}-copy-${copyNum}`
    }

    await $fetch('/api/products', {
      method: 'POST',
      body: {
        productId: newProductId,
        productName: `${product.productName} (Copy)`,
        shortDescription: product.shortDescription,
        description: product.description,
        images: product.images,
        pack1Price: product.pack1Price,
        pack2Price: product.pack2Price,
        pack3Price: product.pack3Price,
        unitPrice: product.unitPrice,
        category: product.category,
        country: product.country || 'Kenya',
        features: product.features,
        isActive: false,
        featured: false,
        currency: product.currency,
        metaPixel: product.metaPixel || undefined,
      },
    })

    await refresh()
    await router.push(`/a/${adminPath.value}/products/${newProductId}`)
  } catch (err: unknown) {
    actionError.value = getErrorMessage(err, 'Could not duplicate this product')
  } finally {
    duplicating.value = null
  }
}

async function deleteProduct(product: Product) {
  deleting.value = product.productId
  actionError.value = ''

  try {
    await $fetch(`/api/products/${product.productId}`, { method: 'DELETE' })
    showDeleteConfirm.value = null
    await refresh()
  } catch (err: unknown) {
    actionError.value = getErrorMessage(err, 'Could not delete this product')
  } finally {
    deleting.value = null
  }
}

function clearFilters() {
  search.value = ''
  filterCountry.value = ''
  filterStatus.value = ''
}
</script>

<template>
  <div class="products-page">
    <div class="admin-header">
      <div>
        <h1>Products</h1>
        <p class="lede">{{ formatCount(liveCount) }} live · {{ formatCount((products || []).length) }} in the catalogue</p>
      </div>
      <NuxtLink :to="`/a/${adminPath}/products/new`" class="btn primary">Add product</NuxtLink>
    </div>

    <div class="toolbar">
      <input
        v-model="search"
        class="search"
        type="search"
        placeholder="Search name, ID, or category"
      >
      <CustomSelect
        v-model="filterCountry"
        :options="countryOptions"
        placeholder="All markets"
      />
      <div class="chips" role="group" aria-label="Product visibility">
        <button type="button" :class="{ active: filterStatus === '' }" @click="filterStatus = ''">All</button>
        <button type="button" :class="{ active: filterStatus === 'live' }" @click="filterStatus = 'live'">Live</button>
        <button type="button" :class="{ active: filterStatus === 'hidden' }" @click="filterStatus = 'hidden'">Hidden</button>
      </div>
    </div>

    <p v-if="actionError" class="error-banner">{{ actionError }}</p>

    <ErrorState
      v-if="productsError"
      title="Could not load products"
      :message="getErrorMessage(productsError)"
      :retry="refresh"
    />

    <div v-else-if="filteredProducts.length" class="list">
      <article v-for="product in filteredProducts" :key="product.productId" class="list-card">
        <NuxtLink :to="`/a/${adminPath}/products/${product.productId}`" class="thumb-link">
          <img
            v-if="product.images[0]"
            :src="product.images[0]"
            :alt="product.productName"
            class="thumb"
          >
          <span v-else class="thumb fallback">{{ product.productName.slice(0, 1) }}</span>
        </NuxtLink>

        <div class="main">
          <h2>
            <NuxtLink :to="`/a/${adminPath}/products/${product.productId}`">
              {{ product.productName }}
            </NuxtLink>
          </h2>
          <p class="meta">
            {{ getCountryFlag(product.country || 'Kenya') }} {{ product.country || 'Kenya' }}
            · {{ product.category }}
            · {{ formatCount(product.soldCount) }} sold
          </p>
          <div class="flags">
            <button
              type="button"
              :class="['flag-chip', product.isActive ? 'live' : 'hidden']"
              @click="toggleActive(product)"
            >
              {{ product.isActive ? 'On the store' : 'Hidden' }}
            </button>
            <button
              type="button"
              :class="['flag-chip', product.featured ? 'featured' : 'quiet']"
              @click="toggleFeatured(product)"
            >
              {{ product.featured ? 'Featured' : 'Not featured' }}
            </button>
          </div>
        </div>

        <div class="aside">
          <p class="price">{{ formatMoney(product.pack1Price, product.currency) }}</p>
          <p class="pack">1-pack price</p>
          <div class="actions">
            <NuxtLink :to="`/a/${adminPath}/products/${product.productId}`" class="btn ghost btn-sm">
              Edit
            </NuxtLink>
            <NuxtLink :to="`/a/${adminPath}/costs?product=${encodeURIComponent(product.productId)}`" class="btn ghost btn-sm">
              Ads
            </NuxtLink>
            <div class="more-wrap" @click.stop>
              <button
                class="more-btn"
                type="button"
                :aria-expanded="openMenu === product.productId"
                @click="toggleMenu($event, product.productId)"
              >
                More
              </button>
              <div v-if="openMenu === product.productId" class="menu">
                <button type="button" :disabled="duplicating === product.productId" @click="duplicateProduct(product)">
                  {{ duplicating === product.productId ? 'Copying…' : 'Duplicate' }}
                </button>
                <a :href="`/product/${product.productId}`" target="_blank" rel="noopener" @click="closeMenu">
                  View on store
                </a>
                <button type="button" class="danger" @click="showDeleteConfirm = product; closeMenu()">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>

    <div v-else class="empty-card">
      <p v-if="search || filterCountry || filterStatus">Nothing matches those filters.</p>
      <p v-else>No products yet. Add one and it will show up here.</p>
      <button v-if="search || filterCountry || filterStatus" class="btn ghost" type="button" @click="clearFilters">
        Clear filters
      </button>
      <NuxtLink v-else :to="`/a/${adminPath}/products/new`" class="btn primary">Add product</NuxtLink>
    </div>

    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = null">
        <div class="modal">
          <h3>Delete {{ showDeleteConfirm.productName }}?</h3>
          <p>This removes it from the store. Existing orders stay as they are.</p>
          <div class="modal-actions">
            <button class="btn ghost" type="button" @click="showDeleteConfirm = null">Keep it</button>
            <button
              class="btn danger"
              type="button"
              :disabled="deleting === showDeleteConfirm.productId"
              @click="deleteProduct(showDeleteConfirm)"
            >
              {{ deleting === showDeleteConfirm.productId ? 'Deleting…' : 'Delete product' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.products-page {
  max-width: 1100px;
}

.lede {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 14px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 20px;
}

.search {
  flex: 1 1 240px;
  min-width: 200px;
}

.chips {
  display: flex;
  gap: 6px;
  padding: 4px;
  background: var(--chip);
  border-radius: 999px;
}

.chips button {
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
  padding: 8px 12px;
  border-radius: 999px;
  cursor: pointer;
}

.chips button.active {
  background: var(--bg-2);
  color: var(--ink);
  box-shadow: 0 1px 0 rgba(20, 23, 20, 0.06);
}

.list {
  display: grid;
  gap: 12px;
}

.list-card {
  display: grid;
  grid-template-columns: 72px 1fr auto;
  gap: 16px;
  align-items: center;
  padding: 16px;
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: 16px;
}

.thumb-link {
  display: block;
}

.thumb,
.fallback {
  width: 72px;
  height: 72px;
  border-radius: 12px;
  object-fit: cover;
  background: var(--chip);
}

.fallback {
  display: grid;
  place-items: center;
  font-weight: 700;
  color: var(--muted);
}

.main h2 {
  margin: 0;
  font-size: 17px;
  line-height: 1.3;
}

.main h2 a {
  color: var(--ink);
  text-decoration: none;
}

.main h2 a:hover {
  color: var(--accent);
}

.meta {
  margin: 4px 0 10px;
  color: var(--muted);
  font-size: 13px;
}

.flags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.flag-chip {
  border: 1px solid var(--line);
  background: var(--bg);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.flag-chip.live {
  background: #d1fae5;
  border-color: #a7f3d0;
  color: #065f46;
}

.flag-chip.hidden {
  background: #fee2e2;
  border-color: #fecaca;
  color: #991b1b;
}

.flag-chip.featured {
  background: #dbeafe;
  border-color: #bfdbfe;
  color: #1e40af;
}

.flag-chip.quiet {
  color: var(--muted);
}

.aside {
  text-align: right;
  min-width: 180px;
}

.price {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--ink);
}

.pack {
  margin: 2px 0 12px;
  font-size: 12px;
  color: var(--muted);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-sm {
  min-height: 40px;
  padding: 0 14px;
  font-size: 13px;
}

.more-wrap {
  position: relative;
}

.more-btn {
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid var(--line);
  background: transparent;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.menu {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  z-index: 5;
  min-width: 160px;
  padding: 6px;
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: var(--shadow);
}

.menu button,
.menu a {
  display: block;
  width: 100%;
  padding: 10px 12px;
  border: 0;
  background: none;
  text-align: left;
  color: var(--ink);
  text-decoration: none;
  font-size: 14px;
  border-radius: 8px;
  cursor: pointer;
}

.menu button:hover,
.menu a:hover {
  background: var(--chip);
}

.menu .danger {
  color: var(--danger);
}

.empty-card {
  padding: 48px 24px;
  text-align: center;
  color: var(--muted);
  background: var(--bg-2);
  border: 1px dashed var(--line);
  border-radius: 16px;
}

.empty-card p {
  margin-bottom: 16px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal {
  background: var(--bg);
  padding: 24px;
  border-radius: 16px;
  max-width: 400px;
  width: 100%;
}

.modal h3 {
  margin: 0 0 8px;
  font-size: 18px;
}

.modal p {
  margin: 0 0 20px;
  color: var(--muted);
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

@media (max-width: 720px) {
  .list-card {
    grid-template-columns: 64px 1fr;
  }

  .thumb,
  .fallback {
    width: 64px;
    height: 64px;
  }

  .aside {
    grid-column: 1 / -1;
    text-align: left;
    min-width: 0;
  }

  .actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>
