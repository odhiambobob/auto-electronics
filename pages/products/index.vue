<script setup lang="ts">
const { data: products, error: productsError, refresh } = await useFetch('/api/products')
const { formatMoney } = useFormat()
const { getCategories, priceBounds } = useCatalog()
const { getErrorMessage } = useApiError()

const config = useRuntimeConfig()

const categories = computed(() => products.value ? getCategories(products.value) : [])
const bounds = computed(() => products.value ? priceBounds(products.value) : { min: 0, max: 10000 })

const category = ref('All')
const minPrice = ref(0)
const maxPrice = ref(100000)
const sort = ref<'bought' | 'price-asc' | 'price-desc'>('bought')
const filtersOpen = ref(false)

// Initialize bounds when data loads
watch(bounds, (newBounds) => {
  minPrice.value = newBounds.min
  maxPrice.value = newBounds.max
}, { immediate: true })

useSeoMeta({
  title: `Catalogue · ${config.public.siteName}`,
  description: 'Filter electronics by category and price. Pack pricing on every product.',
})

const filtered = computed(() => {
  if (!products.value) return []
  
  const list = products.value.filter((product) => {
    const inCategory = category.value === 'All' || product.category === category.value
    const price = product.pack1Price
    return inCategory && price >= minPrice.value && price <= maxPrice.value
  })

  return [...list].sort((a, b) => {
    if (sort.value === 'price-asc') return a.pack1Price - b.pack1Price
    if (sort.value === 'price-desc') return b.pack1Price - a.pack1Price
    return b.soldCount - a.soldCount
  })
})

function reset() {
  category.value = 'All'
  minPrice.value = bounds.value.min
  maxPrice.value = bounds.value.max
  sort.value = 'bought'
}
</script>

<template>
  <div class="page">
    <header class="intro">
      <p class="eyebrow">Catalogue</p>
      <h1>All products</h1>
      <p>Filter by category and starting pack price. Open any item for the order form.</p>
    </header>

    <div class="layout">
      <button class="filter-toggle" type="button" @click="filtersOpen = !filtersOpen">
        {{ filtersOpen ? 'Hide filters' : 'Show filters' }}
      </button>

      <aside class="filters" :class="{ open: filtersOpen }">
        <div class="group category-group">
          <h2>Category</h2>
          <label class="category-option">
            <input v-model="category" type="radio" value="All" />
            <span>All</span>
          </label>
          <label v-for="item in categories" :key="item" class="category-option">
            <input v-model="category" type="radio" :value="item" />
            <span>{{ item }}</span>
          </label>
        </div>

        <div class="group">
          <h2>Price from (1 pack)</h2>
          <div class="range">
            <label>
              Min
              <input v-model.number="minPrice" type="number" :min="bounds.min" :max="maxPrice" />
            </label>
            <label>
              Max
              <input v-model.number="maxPrice" type="number" :min="minPrice" :max="bounds.max" />
            </label>
          </div>
          <p class="hint">
            {{ formatMoney(minPrice, 'KES') }}
            –
            {{ formatMoney(maxPrice, 'KES') }}
          </p>
        </div>

        <div class="group">
          <h2>Sort</h2>
          <select v-model="sort">
            <option value="bought">Most bought</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </div>

        <button class="text-btn" type="button" @click="reset">Reset</button>
      </aside>

      <section>
        <p class="count">{{ filtered.length }} product{{ filtered.length === 1 ? '' : 's' }}</p>
        <ErrorState
          v-if="productsError"
          title="Could not load products"
          :message="getErrorMessage(productsError, 'The catalogue is unavailable right now.')"
          :retry="refresh"
        />
        <div v-else-if="filtered.length" class="grid">
          <ProductCard v-for="product in filtered" :key="product.productId" :product="product" />
        </div>
        <p v-else class="empty">Nothing in that range. Reset the filters or pick another category.</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.page {
  width: min(1180px, calc(100% - 32px));
  margin: 0 auto;
  padding: 36px 0;
}

.eyebrow {
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
}

h1 {
  font-family: var(--display);
  font-size: clamp(36px, 5vw, 56px);
  letter-spacing: -0.06em;
  margin: 6px 0 10px;
}

.intro p:last-child {
  color: var(--text);
  max-width: 42ch;
}

.layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 40px;
  margin-top: 36px;
  align-items: start;
}

.filters {
  display: grid;
  gap: 22px;
  position: sticky;
  top: 88px;
  text-align: left;
}

.group {
  display: grid;
  gap: 8px;
}

h2 {
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  margin: 0;
}

label {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 15px;
}

.category-group {
  justify-items: stretch;
  text-align: left;
}

.category-option {
  width: 100%;
  min-height: 42px;
  padding: 8px 10px;
  border-radius: 10px;
  cursor: pointer;
  transition: background-color 160ms ease;
}

.category-option:hover,
.category-option:has(input:checked) {
  background: var(--chip);
}

.category-option span {
  color: var(--ink);
  line-height: 1.3;
}

.range {
  display: grid;
  gap: 8px;
}

input[type='number'],
select {
  width: 100%;
  margin-top: 4px;
}

.hint,
.count,
.empty {
  color: var(--muted);
  font-size: 14px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 28px 20px;
  margin-top: 16px;
}

.text-btn,
.filter-toggle {
  background: none;
  border: 0;
  padding: 0;
  color: var(--ink);
  font-weight: 600;
  cursor: pointer;
  text-align: left;
}

.filter-toggle {
  display: none;
}

@media (max-width: 820px) {
  .layout {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .filter-toggle {
    display: block;
  }

  .filters {
    position: static;
    display: none;
    padding: 16px;
    border: 1px solid var(--line);
    border-radius: 16px;
    background: var(--bg-2);
  }

  .filters.open {
    display: grid;
  }

  .category-group {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .category-group h2 {
    grid-column: 1 / -1;
  }
}

@media (max-width: 480px) {
  .page {
    width: min(100% - 24px, 1180px);
    padding-top: 24px;
  }

  .category-group {
    grid-template-columns: 1fr;
  }

  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 22px 12px;
  }
}
</style>
