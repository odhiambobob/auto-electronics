<script setup lang="ts">
const router = useRouter()
const { formatMoney } = useFormat()
const adminPath = useState<string>('adminPath')

// Fetch all products (including inactive for admin)
const { data: products, refresh } = await useFetch('/api/admin/products')

const duplicating = ref<string | null>(null)
const deleting = ref<string | null>(null)
const filterCountry = ref('')
const showDeleteConfirm = ref<string | null>(null)

// Get unique countries for filtering
const countries = computed(() => {
  const countrySet = new Set<string>()
  products.value?.forEach((p: any) => {
    if (p.country) countrySet.add(p.country)
  })
  return Array.from(countrySet).sort()
})

// Options for custom select
const countryOptions = computed(() => [
  { value: '', label: 'All Countries' },
  ...countries.value.map(c => ({ value: c, label: c }))
])

// Filtered products
const filteredProducts = computed(() => {
  if (!products.value) return []
  if (!filterCountry.value) return products.value
  return products.value.filter((p: any) => p.country === filterCountry.value)
})

async function toggleActive(product: any) {
  await $fetch(`/api/products/${product.productId}`, {
    method: 'PUT',
    body: { isActive: !product.isActive },
  })
  await refresh()
}

async function toggleFeatured(product: any) {
  await $fetch(`/api/products/${product.productId}`, {
    method: 'PUT',
    body: { featured: !product.featured },
  })
  await refresh()
}

async function duplicateProduct(product: any) {
  duplicating.value = product.productId
  
  try {
    // Generate new product ID with -copy suffix
    let newProductId = `${product.productId}-copy`
    
    // Check if copy already exists, add number if needed
    const existingIds = products.value?.map((p: any) => p.productId) || []
    let copyNum = 1
    while (existingIds.includes(newProductId)) {
      copyNum++
      newProductId = `${product.productId}-copy-${copyNum}`
    }
    
    // Create the duplicate
    const newProduct = await $fetch('/api/products', {
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
        isActive: false, // Start as inactive
        featured: false,
        currency: product.currency,
      },
    })
    
    // Refresh and redirect to edit the new product
    await refresh()
    await router.push(`/a/${adminPath.value}/products/${newProductId}`)
  } catch (err: any) {
    console.error('Failed to duplicate product:', err)
    alert(err?.data?.message || 'Failed to duplicate product. The product ID may already exist.')
  } finally {
    duplicating.value = null
  }
}

function confirmDelete(productId: string) {
  showDeleteConfirm.value = productId
}

function cancelDelete() {
  showDeleteConfirm.value = null
}

async function deleteProduct(productId: string) {
  deleting.value = productId
  
  try {
    await $fetch(`/api/products/${productId}`, {
      method: 'DELETE',
    })
    showDeleteConfirm.value = null
    await refresh()
  } catch (err: any) {
    console.error('Failed to delete product:', err)
    alert(err?.data?.message || 'Failed to delete product')
  } finally {
    deleting.value = null
  }
}
</script>

<template>
  <div class="products-page">
    <div class="admin-header">
      <h1>Products</h1>
      <NuxtLink :to="`/a/${adminPath}/products/new`" class="btn primary">Add Product</NuxtLink>
    </div>

    <div class="filter-bar">
      <div class="filter-group">
        <span class="filter-label">Filter by Country:</span>
        <CustomSelect 
          v-model="filterCountry" 
          :options="countryOptions"
          placeholder="All Countries"
        />
      </div>
      <span class="product-count">{{ filteredProducts.length }} product(s)</span>
    </div>

    <div class="card">
      <table v-if="filteredProducts.length" class="data-table">
        <thead>
          <tr>
            <th>Image</th>
            <th>Name</th>
            <th>Country</th>
            <th>Category</th>
            <th>1-Pack Price</th>
            <th>Sold</th>
            <th>Status</th>
            <th>Featured</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in filteredProducts" :key="product.productId">
            <td>
              <img :src="product.images[0]" :alt="product.productName" class="product-thumb" />
            </td>
            <td>
              <span class="product-name">{{ product.productName }}</span>
              <span class="product-id">{{ product.productId }}</span>
            </td>
            <td>
              <span class="country-badge">{{ product.country || 'Kenya' }}</span>
            </td>
            <td>{{ product.category }}</td>
            <td>{{ formatMoney(product.pack1Price, product.currency) }}</td>
            <td>{{ product.soldCount }}</td>
            <td>
              <button 
                :class="['toggle-btn', product.isActive ? 'active' : 'inactive']"
                @click="toggleActive(product)"
              >
                {{ product.isActive ? 'Active' : 'Inactive' }}
              </button>
            </td>
            <td>
              <button 
                :class="['toggle-btn', product.featured ? 'featured' : '']"
                @click="toggleFeatured(product)"
              >
                {{ product.featured ? 'Featured' : 'Not Featured' }}
              </button>
            </td>
            <td class="actions-cell">
              <NuxtLink :to="`/a/${adminPath}/products/${product.productId}`" class="action-link">
                Edit
              </NuxtLink>
              <button 
                class="action-link duplicate" 
                :disabled="duplicating === product.productId"
                @click="duplicateProduct(product)"
              >
                {{ duplicating === product.productId ? 'Copying...' : 'Duplicate' }}
              </button>
              <button 
                class="action-link delete" 
                @click="confirmDelete(product.productId)"
              >
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-else class="empty">{{ filterCountry ? 'No products found for this country.' : 'No products yet. Add your first product!' }}</p>
    </div>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="cancelDelete">
        <div class="modal">
          <h3>Delete Product</h3>
          <p>Are you sure you want to delete <strong>{{ showDeleteConfirm }}</strong>?</p>
          <p class="warning">This action cannot be undone.</p>
          <div class="modal-actions">
            <button class="btn secondary" @click="cancelDelete">Cancel</button>
            <button 
              class="btn danger" 
              :disabled="deleting === showDeleteConfirm"
              @click="deleteProduct(showDeleteConfirm)"
            >
              {{ deleting === showDeleteConfirm ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.products-page {
  max-width: 1400px;
}

.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;
  padding: 12px 16px;
  background: var(--chip);
  border-radius: 8px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-label {
  font-size: 14px;
  font-weight: 500;
}

.product-count {
  color: var(--muted);
  font-size: 14px;
}

.country-badge {
  display: inline-block;
  padding: 4px 8px;
  background: var(--chip);
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.product-thumb {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 8px;
  background: var(--chip);
}

.product-name {
  display: block;
  font-weight: 500;
}

.product-id {
  display: block;
  font-size: 12px;
  color: var(--muted);
  font-family: monospace;
}

.toggle-btn {
  padding: 4px 10px;
  border: 1px solid var(--line);
  background: var(--bg);
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}

.toggle-btn.active {
  background: #d1fae5;
  border-color: #065f46;
  color: #065f46;
}

.toggle-btn.inactive {
  background: #fee2e2;
  border-color: #991b1b;
  color: #991b1b;
}

.toggle-btn.featured {
  background: #dbeafe;
  border-color: #1e40af;
  color: #1e40af;
}

.actions-cell {
  display: flex;
  gap: 12px;
}

.action-link {
  color: var(--accent);
  text-decoration: none;
  font-size: 14px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.15s;
}

.action-link:hover {
  background: var(--chip);
}

.action-link.delete {
  color: #dc2626;
}

.action-link.delete:hover {
  background: #fee2e2;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--bg);
  padding: 24px;
  border-radius: 16px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.modal h3 {
  margin: 0 0 12px;
  font-size: 18px;
}

.modal p {
  margin: 0 0 8px;
  color: var(--text);
}

.modal .warning {
  color: #dc2626;
  font-size: 14px;
  margin-bottom: 20px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn.secondary {
  background: var(--chip);
  color: var(--ink);
}

.btn.danger {
  background: #dc2626;
  color: white;
}

.btn.danger:hover {
  background: #b91c1c;
}

.action-link:hover {
  text-decoration: underline;
}

.action-link.duplicate {
  color: var(--muted);
}

.action-link.duplicate:hover {
  color: var(--ink);
}

.action-link:disabled {
  opacity: 0.5;
  cursor: wait;
}

.empty {
  color: var(--muted);
  text-align: center;
  padding: 32px;
}
</style>
