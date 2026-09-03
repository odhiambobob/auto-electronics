<script setup lang="ts">
const props = defineProps<{ productId: string }>()
const router = useRouter()
const adminPath = useState<string>('adminPath')

// Use admin endpoint to fetch product (includes inactive products)
const { data: product, error: productError, refresh } = await useFetch(
  () => `/api/admin/products/${encodeURIComponent(props.productId)}`,
)

const saving = ref(false)
const error = ref('')
const success = ref('')
const uploading = ref(false)
const showPreview = ref(false)
const duplicating = ref(false)
const deleting = ref(false)
const showDeleteConfirm = ref(false)
const { getErrorMessage } = useApiError()

const form = reactive({
  productName: '',
  shortDescription: '',
  description: '',
  images: [] as string[],
  pack1Price: 0,
  pack2Price: 0,
  pack3Price: 0,
  unitPrice: 0,
  category: '',
  country: 'Kenya',
  features: [] as string[],
  isActive: true,
  featured: false,
  currency: 'KES',
  metaPixel: '',
})

const { countryData, countryOptions } = useCountries()

// Track if we should auto-update currency (only when user manually changes country)
const manualCountryChange = ref(false)

// Auto-set currency when country changes manually
watch(() => form.country, (newCountry) => {
  if (manualCountryChange.value && newCountry && countryData[newCountry]) {
    form.currency = countryData[newCountry].currency
  }
  manualCountryChange.value = true // After first load, all changes are manual
})

watch(product, (p) => {
  if (p) {
    form.productName = p.productName
    form.shortDescription = p.shortDescription
    form.description = p.description
    form.images = [...p.images]
    form.pack1Price = p.pack1Price
    form.pack2Price = p.pack2Price
    form.pack3Price = p.pack3Price
    form.unitPrice = p.unitPrice
    form.category = p.category
    form.country = p.country || 'Kenya'
    form.features = [...p.features]
    form.isActive = p.isActive
    form.featured = p.featured
    form.currency = p.currency
    form.metaPixel = p.metaPixel || ''
  }
}, { immediate: true })

const newFeature = ref('')
const imageUrl = ref('')
const imageInputMode = ref<'upload' | 'url'>('upload')

function addFeature() {
  const input = newFeature.value.trim()
  if (!input) return
  
  // Support comma-separated features
  const features = input.split(',').map(f => f.trim()).filter(f => f.length > 0)
  
  for (const feature of features) {
    if (!form.features.includes(feature)) {
      form.features.push(feature)
    }
  }
  newFeature.value = ''
}

function removeFeature(index: number) {
  form.features.splice(index, 1)
}

function removeImage(index: number) {
  form.images.splice(index, 1)
}

function addImageUrl() {
  const input = imageUrl.value.trim()
  if (!input) {
    error.value = 'Please enter a URL'
    return
  }
  
  // Support comma-separated URLs
  const urls = input.split(',').map(u => u.trim()).filter(u => u.length > 0)
  let added = 0
  let invalid = 0
  
  for (const url of urls) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      invalid++
      continue
    }
    if (form.images.includes(url)) {
      continue // Skip duplicates silently
    }
    form.images.push(url)
    added++
  }
  
  if (added > 0) {
    imageUrl.value = ''
    error.value = ''
  } else if (invalid > 0) {
    error.value = 'URLs must start with http:// or https://'
  } else {
    error.value = 'All URLs are already added'
  }
}

// Handle paste event for multiple URLs
function handleImagePaste(event: ClipboardEvent) {
  const pastedText = event.clipboardData?.getData('text') || ''
  const urls = pastedText.split(/[\n\s,]+/).filter(url => url.startsWith('http'))
  
  if (urls.length > 1) {
    event.preventDefault()
    let added = 0
    for (const url of urls) {
      const trimmedUrl = url.trim()
      if (trimmedUrl && !form.images.includes(trimmedUrl)) {
        form.images.push(trimmedUrl)
        added++
      }
    }
    if (added > 0) {
      imageUrl.value = ''
      error.value = ''
    }
  }
}

async function uploadImages(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  uploading.value = true
  error.value = ''
  
  try {
    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append('file', file)
      
      const result = await $fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      
      form.images.push(result.url)
    }
  } catch (err) {
    error.value = getErrorMessage(err, 'Failed to upload one or more images')
  } finally {
    uploading.value = false
    input.value = ''
  }
}

function moveImage(index: number, direction: 'up' | 'down') {
  const newIndex = direction === 'up' ? index - 1 : index + 1
  if (newIndex < 0 || newIndex >= form.images.length) return
  const temp = form.images[index]
  form.images[index] = form.images[newIndex]
  form.images[newIndex] = temp
}

async function updateProduct() {
  error.value = ''
  success.value = ''
  saving.value = true
  
  try {
    await $fetch(`/api/products/${props.productId}`, {
      method: 'PUT',
      body: {
        ...form,
        metaPixel: form.metaPixel.trim() || null,
      },
    })
    await refresh()
    success.value = 'Product updated successfully!'
  } catch (err: unknown) {
    error.value = getErrorMessage(err, 'Failed to update product')
  } finally {
    saving.value = false
  }
}

function viewOnStore() {
  window.open(`/product/${props.productId}`, '_blank')
}

async function duplicateProduct() {
  if (!product.value) return
  
  duplicating.value = true
  
  try {
    // Generate new product ID with -copy suffix
    let newProductId = `${props.productId}-copy`
    
    // Fetch all products to check for existing IDs
    const allProducts = await $fetch('/api/admin/products')
    const existingIds = (allProducts as any[]).map((p: any) => p.productId)
    
    let copyNum = 1
    while (existingIds.includes(newProductId)) {
      copyNum++
      newProductId = `${props.productId}-copy-${copyNum}`
    }
    
    // Create the duplicate with current form values
    await $fetch('/api/products', {
      method: 'POST',
      body: {
        productId: newProductId,
        productName: `${form.productName} (Copy)`,
        shortDescription: form.shortDescription,
        description: form.description,
        images: form.images,
        pack1Price: form.pack1Price,
        pack2Price: form.pack2Price,
        pack3Price: form.pack3Price,
        unitPrice: form.unitPrice,
        category: form.category,
        country: form.country,
        features: form.features,
        isActive: false, // Start as inactive
        featured: false,
        currency: form.currency,
        metaPixel: form.metaPixel.trim() || undefined,
      },
    })
    
    // Redirect to edit the new product
    await router.push(`/a/${adminPath.value}/products/${newProductId}`)
  } catch (err: unknown) {
    console.error('Failed to duplicate product:', err)
    error.value = getErrorMessage(err, 'Failed to duplicate product. The product ID may already exist.')
  } finally {
    duplicating.value = false
  }
}

async function deleteProduct() {
  deleting.value = true
  error.value = ''
  
  try {
    await $fetch(`/api/products/${props.productId}`, {
      method: 'DELETE',
    })
    // Redirect to products list
    await router.push(`/a/${adminPath.value}/products`)
  } catch (err: unknown) {
    console.error('Failed to delete product:', err)
    error.value = getErrorMessage(err, 'Failed to delete product')
    showDeleteConfirm.value = false
  } finally {
    deleting.value = false
  }
}

const previewSrc = computed(() => {
  if (!props.productId) return ''
  return `/product/${encodeURIComponent(props.productId)}?preview=1`
})
</script>

<template>
  <div v-if="product" class="product-form">
    <!-- Preview Modal -->
    <div v-if="showPreview" class="preview-overlay">
      <div class="preview-modal">
        <div class="preview-header">
          <h2>Device Preview</h2>
          <button class="close-btn" @click="showPreview = false">&times;</button>
        </div>
        
        <p class="preview-intro">Preview how your product looks on different devices:</p>
        
        <div class="device-previews">
          <div class="device desktop">
            <div class="device-label">Desktop</div>
            <div class="device-frame">
              <iframe v-if="previewSrc" :src="previewSrc" title="Desktop preview" />
            </div>
          </div>
          
          <div class="device tablet">
            <div class="device-label">Tablet</div>
            <div class="device-frame">
              <iframe v-if="previewSrc" :src="previewSrc" title="Tablet preview" />
            </div>
          </div>
          
          <div class="device mobile">
            <div class="device-label">Mobile</div>
            <div class="device-frame">
              <iframe v-if="previewSrc" :src="previewSrc" title="Mobile preview" />
            </div>
          </div>
        </div>
        
        <div class="preview-actions">
          <button class="btn ghost" @click="showPreview = false">Close</button>
          <button class="btn primary" @click="viewOnStore">Open in New Tab</button>
        </div>
      </div>
    </div>

    <div class="admin-header">
      <div>
        <NuxtLink :to="`/a/${adminPath}/products`" class="back-link">&larr; All Products</NuxtLink>
        <h1>Edit {{ product.productName }}</h1>
        <p class="product-id-display">ID: {{ product.productId }}</p>
      </div>
      <div class="header-actions">
        <button class="btn ghost" :disabled="duplicating" @click="duplicateProduct">
          {{ duplicating ? 'Duplicating...' : 'Duplicate' }}
        </button>
        <button class="btn ghost" @click="showPreview = true">Preview</button>
        <button class="btn danger-outline" @click="showDeleteConfirm = true">Delete</button>
      </div>
    </div>

    <form @submit.prevent="updateProduct">
      <div class="form-grid">
        <div class="card">
          <h2>Basic Info</h2>
          
          <div class="form-group">
            <label>Product ID</label>
            <input :value="product.productId" type="text" disabled />
            <p class="hint">Product ID cannot be changed</p>
          </div>

          <div class="form-group">
            <label>Product Name</label>
            <input v-model="form.productName" type="text" required />
          </div>

          <div class="form-group">
            <label>Category</label>
            <input v-model="form.category" type="text" required />
          </div>

          <div class="form-group">
            <label>Country / Region</label>
            <CustomSelect 
              v-model="form.country" 
              :options="countryOptions"
            />
            <p class="hint">Search and select any African country. Currency updates automatically.</p>
          </div>

          <div class="form-group">
            <label>Short Description</label>
            <textarea v-model="form.shortDescription" rows="2"></textarea>
          </div>

          <div class="form-group">
            <label>Full Description (Markdown)</label>
            <textarea v-model="form.description" rows="8"></textarea>
          </div>
        </div>

        <div class="card">
          <h2>Pricing</h2>
          
          <div class="form-group">
            <label>Unit Price</label>
            <input v-model.number="form.unitPrice" type="number" min="0" />
          </div>

          <div class="form-group">
            <label>1-Pack Price</label>
            <input v-model.number="form.pack1Price" type="number" min="0" />
          </div>

          <div class="form-group">
            <label>2-Pack Price</label>
            <input v-model.number="form.pack2Price" type="number" min="0" />
          </div>

          <div class="form-group">
            <label>3-Pack Price</label>
            <input v-model.number="form.pack3Price" type="number" min="0" />
          </div>

          <div class="form-group">
            <label>Currency</label>
            <input v-model="form.currency" type="text" />
          </div>
        </div>

        <div class="card">
          <h2>Images</h2>
          
          <div class="image-mode-toggle">
            <button 
              type="button" 
              :class="{ active: imageInputMode === 'upload' }"
              @click="imageInputMode = 'upload'"
            >
              Upload Files
            </button>
            <button 
              type="button" 
              :class="{ active: imageInputMode === 'url' }"
              @click="imageInputMode = 'url'"
            >
              Paste URLs
            </button>
          </div>

          <div v-if="imageInputMode === 'upload'" class="image-upload-section">
            <label class="upload-btn">
              <input type="file" accept="image/*" multiple hidden @change="uploadImages" />
              {{ uploading ? 'Uploading...' : 'Select Images' }}
            </label>
            <p class="hint">You can select multiple images at once</p>
          </div>

          <div v-else class="image-url-section">
            <div class="url-input-group">
              <input 
                v-model="imageUrl" 
                type="url" 
                placeholder="https://example.com/image.jpg"
                @keyup.enter="addImageUrl"
                @paste="handleImagePaste"
              />
              <button type="button" class="add-url-btn" @click="addImageUrl">Add</button>
            </div>
            <p class="hint">Paste one or multiple URLs (separated by newlines or commas)</p>
          </div>
          
          <div v-if="form.images.length" class="images-grid">
            <div v-for="(image, index) in form.images" :key="image" class="image-item">
              <img :src="image" alt="Product image" />
              <div class="image-actions">
                <button 
                  v-if="index > 0" 
                  type="button" 
                  class="move-btn" 
                  title="Move up"
                  @click="moveImage(index, 'up')"
                >↑</button>
                <button 
                  v-if="index < form.images.length - 1" 
                  type="button" 
                  class="move-btn" 
                  title="Move down"
                  @click="moveImage(index, 'down')"
                >↓</button>
                <button type="button" class="remove-btn" @click="removeImage(index)">&times;</button>
              </div>
              <span v-if="index === 0" class="primary-badge">Primary</span>
            </div>
          </div>
          <p v-else class="empty-images">No images added yet</p>
        </div>

        <div class="card">
          <h2>Features</h2>
          
          <ul v-if="form.features.length" class="features-list">
            <li v-for="(feature, index) in form.features" :key="index">
              {{ feature }}
              <button type="button" @click="removeFeature(index)">&times;</button>
            </li>
          </ul>

          <div class="add-feature">
            <input 
              v-model="newFeature" 
              type="text" 
              placeholder="Feature 1, Feature 2, Feature 3" 
              @keyup.enter="addFeature" 
            />
            <button type="button" @click="addFeature">Add</button>
          </div>
          <p class="hint">Add multiple features at once by separating them with commas</p>
        </div>

        <div class="card">
          <h2>Visibility</h2>
          
          <label class="checkbox-label">
            <input v-model="form.isActive" type="checkbox" />
            Active (visible on store)
          </label>

          <label class="checkbox-label">
            <input v-model="form.featured" type="checkbox" />
            Featured (shown on homepage)
          </label>

          <div class="form-group pixel-field">
            <label>Meta Pixel ID (optional)</label>
            <input v-model="form.metaPixel" type="text" inputmode="numeric" placeholder="1080694787636988" />
            <p class="hint">Leave blank to use the site default pixel. Unique per product if you run separate ad campaigns.</p>
          </div>
        </div>
      </div>

      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="success" class="success">{{ success }}</p>

      <div class="form-actions">
        <NuxtLink :to="`/a/${adminPath}/products`" class="btn ghost">Cancel</NuxtLink>
        <button class="btn primary" type="submit" :disabled="saving">
          {{ saving ? 'Saving...' : 'Save Changes' }}
        </button>
      </div>
    </form>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
        <div class="modal">
          <h3>Delete Product</h3>
          <p>Are you sure you want to delete <strong>{{ product.productName }}</strong>?</p>
          <p class="warning">This action cannot be undone. All product data will be permanently removed.</p>
          <div class="modal-actions">
            <button class="btn secondary" @click="showDeleteConfirm = false">Cancel</button>
            <button 
              class="btn danger" 
              :disabled="deleting"
              @click="deleteProduct"
            >
              {{ deleting ? 'Deleting...' : 'Delete Product' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>

  <ErrorState
    v-else-if="productError"
    title="Could not load this product"
    :message="getErrorMessage(productError, 'This product could not be loaded for editing.')"
    :retry="refresh"
  >
    <NuxtLink :to="`/a/${adminPath}/products`">Back to products</NuxtLink>
  </ErrorState>

  <p v-else class="empty">Loading product…</p>
</template>

<style scoped>
.product-form {
  max-width: 1000px;
}

.empty {
  color: var(--muted);
  padding: 32px;
}

.back-link {
  font-size: 14px;
  color: var(--muted);
  text-decoration: none;
  display: block;
  margin-bottom: 8px;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.product-id-display {
  font-size: 13px;
  color: var(--muted);
  font-family: monospace;
  margin-top: 4px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.card {
  padding: 24px;
}

.card h2 {
  font-size: 16px;
  margin: 0 0 16px;
}

.hint {
  font-size: 12px;
  color: var(--muted);
  margin-top: 4px;
}

/* Image input modes */
.image-mode-toggle {
  display: flex;
  gap: 0;
  margin-bottom: 16px;
  border: 1px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
}

.image-mode-toggle button {
  flex: 1;
  padding: 10px 16px;
  border: none;
  background: var(--bg);
  cursor: pointer;
  font-size: 14px;
  transition: background-color 160ms ease;
}

.image-mode-toggle button.active {
  background: var(--ink);
  color: var(--bg);
}

.image-upload-section,
.image-url-section {
  margin-bottom: 16px;
}

.url-input-group {
  display: flex;
  gap: 8px;
}

.url-input-group input {
  flex: 1;
}

.add-url-btn {
  padding: 8px 16px;
  background: var(--chip);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.image-item {
  position: relative;
  aspect-ratio: 1;
}

.image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}

.image-actions {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  gap: 4px;
}

.image-actions button {
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-actions .remove-btn {
  border-radius: 50%;
}

.primary-badge {
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: var(--accent);
  color: white;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.empty-images {
  color: var(--muted);
  text-align: center;
  padding: 24px;
  background: var(--chip);
  border-radius: 8px;
}

.upload-btn {
  display: inline-block;
  padding: 10px 16px;
  background: var(--chip);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.features-list {
  list-style: none;
  padding: 0;
  margin: 0 0 16px;
}

.features-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--line);
}

.features-list button {
  background: none;
  border: none;
  color: var(--danger);
  cursor: pointer;
  font-size: 18px;
}

.add-feature {
  display: flex;
  gap: 8px;
}

.add-feature input {
  flex: 1;
}

.add-feature button {
  padding: 8px 16px;
  background: var(--chip);
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  cursor: pointer;
}

.checkbox-label input {
  width: auto;
}

.pixel-field {
  margin-top: 16px;
}

.error {
  color: var(--danger);
  margin: 16px 0;
}

.success {
  color: var(--good);
  margin: 16px 0;
}

.form-actions {
  margin-top: 24px;
}

/* Preview Modal */
.preview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.preview-modal {
  background: var(--bg);
  border-radius: 20px;
  width: 100%;
  max-width: 1400px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 32px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.preview-header h2 {
  margin: 0;
}

.close-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: var(--chip);
  border-radius: 50%;
  font-size: 24px;
  cursor: pointer;
}

.preview-intro {
  color: var(--text);
  margin-bottom: 24px;
}

.device-previews {
  display: grid;
  grid-template-columns: 1.2fr 0.5fr 0.3fr;
  gap: 24px;
  margin-bottom: 32px;
}

.device {
  display: flex;
  flex-direction: column;
}

.device-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  margin-bottom: 8px;
}

.device-frame {
  background: var(--ink);
  border-radius: 16px;
  padding: 8px;
  overflow: hidden;
}

.device-frame iframe {
  width: 100%;
  border: none;
  border-radius: 8px;
  background: white;
}

.device.desktop .device-frame iframe {
  height: 500px;
}

.device.tablet .device-frame iframe {
  height: 600px;
}

.device.mobile .device-frame iframe {
  height: 700px;
}

.preview-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 1200px) {
  .device-previews {
    grid-template-columns: 1fr 1fr;
  }
  
  .device.desktop {
    grid-column: 1 / -1;
  }
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .device-previews {
    grid-template-columns: 1fr;
  }
  
  .images-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Danger button outline */
.btn.danger-outline {
  background: transparent;
  color: #dc2626;
  border: 1px solid #dc2626;
}

.btn.danger-outline:hover {
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
</style>
