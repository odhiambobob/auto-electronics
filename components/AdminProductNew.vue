<script setup lang="ts">
const router = useRouter()
const adminPath = useState<string>('adminPath')

const saving = ref(false)
const error = ref('')
const uploading = ref(false)
const showPreview = ref(false)
const createdProduct = ref<any>(null)
const { getErrorMessage } = useApiError()

const form = reactive({
  productId: '',
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

// Auto-set currency when country changes
watch(() => form.country, (newCountry) => {
  if (newCountry && countryData[newCountry]) {
    form.currency = countryData[newCountry].currency
  }
})

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

async function createProduct() {
  error.value = ''
  
  if (!form.productId || !form.productName || !form.category) {
    error.value = 'Product ID, name, and category are required'
    return
  }

  if (form.images.length === 0) {
    error.value = 'At least one image is required'
    return
  }

  saving.value = true
  try {
    const product = await $fetch('/api/products', {
      method: 'POST',
      body: {
        ...form,
        metaPixel: form.metaPixel.trim() || undefined,
      },
    })
    createdProduct.value = product
    showPreview.value = true
  } catch (err: unknown) {
    error.value = getErrorMessage(err, 'Failed to create product')
  } finally {
    saving.value = false
  }
}

function goToProducts() {
  router.push(`/a/${adminPath.value}/products`)
}

function viewOnStore() {
  window.open(`/product/${createdProduct.value.productId}`, '_blank')
}
</script>

<template>
  <div class="product-form">
    <!-- Preview Modal -->
    <div v-if="showPreview" class="preview-overlay">
      <div class="preview-modal">
        <div class="preview-header">
          <h2>Product Created Successfully!</h2>
          <button class="close-btn" @click="goToProducts">&times;</button>
        </div>
        
        <p class="preview-intro">Preview how your product will look on different devices:</p>
        
        <div class="device-previews">
          <div class="device desktop">
            <div class="device-label">Desktop</div>
            <div class="device-frame">
              <iframe :src="`/product/${createdProduct?.productId}`" />
            </div>
          </div>
          
          <div class="device tablet">
            <div class="device-label">Tablet</div>
            <div class="device-frame">
              <iframe :src="`/product/${createdProduct?.productId}`" />
            </div>
          </div>
          
          <div class="device mobile">
            <div class="device-label">Mobile</div>
            <div class="device-frame">
              <iframe :src="`/product/${createdProduct?.productId}`" />
            </div>
          </div>
        </div>
        
        <div class="preview-actions">
          <button class="btn ghost" @click="goToProducts">Back to Products</button>
          <button class="btn primary" @click="viewOnStore">View on Store</button>
        </div>
      </div>
    </div>

    <div class="admin-header">
      <div>
        <NuxtLink :to="`/a/${adminPath}/products`" class="back-link">&larr; All Products</NuxtLink>
        <h1>New Product</h1>
      </div>
    </div>

    <form @submit.prevent="createProduct">
      <div class="form-grid">
        <div class="card">
          <h2>Basic Info</h2>
          
          <div class="form-group">
            <label>Product ID (slug)</label>
            <input v-model="form.productId" type="text" placeholder="ae-product-name" required />
            <p class="hint">Unique identifier used in URLs</p>
          </div>

          <div class="form-group">
            <label>Product Name</label>
            <input v-model="form.productName" type="text" required />
          </div>

          <div class="form-group">
            <label>Category</label>
            <input v-model="form.category" type="text" placeholder="Audio, Charging, etc." required />
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
            <textarea v-model="form.shortDescription" rows="2" placeholder="One-line summary for cards"></textarea>
          </div>

          <div class="form-group">
            <label>Full Description (Markdown)</label>
            <textarea v-model="form.description" rows="8" placeholder="Use ## for headings, - for lists"></textarea>
          </div>
        </div>

        <div class="card">
          <h2>Pricing</h2>
          
          <div class="form-group">
            <label>Unit Price (base price per item)</label>
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
            <input v-model="form.currency" type="text" placeholder="KES" />
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

      <div class="form-actions">
        <NuxtLink :to="`/a/${adminPath}/products`" class="btn ghost">Cancel</NuxtLink>
        <button class="btn primary" type="submit" :disabled="saving">
          {{ saving ? 'Creating...' : 'Create Product' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.product-form {
  max-width: 1000px;
}

.back-link {
  font-size: 14px;
  color: var(--muted);
  text-decoration: none;
  display: block;
  margin-bottom: 8px;
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
  color: var(--good);
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
</style>
