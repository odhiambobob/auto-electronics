<script setup lang="ts">
const { data: settings, error: settingsError, refresh } = await useFetch('/api/settings')
const { data: adminData } = await useFetch('/api/admin/me')
const { getErrorMessage } = useApiError()

const saving = ref(false)
const uploading = ref(false)
const error = ref('')
const success = ref('')
const activeTab = ref('general')
const showLogoutConfirm = ref(false)

const form = reactive({
  logo: '',
  siteName: '',
  whatsappNumber: '',
  supportEmail: '',
  currency: 'KES',
  deliveryNote: '',
  socialFacebook: '',
  socialInstagram: '',
  socialTwitter: '',
})

const tabs = [
  { id: 'general', label: 'General', icon: '⚙️' },
  { id: 'contact', label: 'Contact', icon: '📞' },
  { id: 'social', label: 'Social Links', icon: '🔗' },
  { id: 'account', label: 'Account', icon: '👤' },
]

watch(settings, (s) => {
  if (s) {
    form.logo = (s.logo as string) || ''
    form.siteName = (s.siteName as string) || ''
    form.whatsappNumber = (s.whatsappNumber as string) || ''
    form.supportEmail = (s.supportEmail as string) || ''
    form.currency = (s.currency as string) || 'KES'
    form.deliveryNote = (s.deliveryNote as string) || ''
    form.socialFacebook = (s.socialFacebook as string) || ''
    form.socialInstagram = (s.socialInstagram as string) || ''
    form.socialTwitter = (s.socialTwitter as string) || ''
  }
}, { immediate: true })

async function uploadLogo(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploading.value = true
  error.value = ''
  try {
    const formData = new FormData()
    formData.append('file', file)
    
    const result = await $fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })
    
    form.logo = result.url
    success.value = 'Logo uploaded! Remember to save.'
  } catch (err: unknown) {
    console.error('Upload failed:', err)
    error.value = getErrorMessage(err, 'Failed to upload logo')
  } finally {
    uploading.value = false
    input.value = ''
  }
}

function removeLogo() {
  form.logo = ''
}

async function saveSettings() {
  saving.value = true
  error.value = ''
  success.value = ''
  
  try {
    await $fetch('/api/settings', {
      method: 'PUT',
      body: form,
    })
    await refresh()
    success.value = 'Settings saved successfully!'
    setTimeout(() => success.value = '', 3000)
  } catch (err: unknown) {
    error.value = getErrorMessage(err, 'Failed to save settings')
  } finally {
    saving.value = false
  }
}

// Admin logout
const router = useRouter()

async function logout() {
  try {
    await $fetch('/api/admin/logout', { method: 'POST' })
    await router.push('/admin-login')
  } catch (err) {
    error.value = getErrorMessage(err, 'Failed to logout. Please try again.')
    showLogoutConfirm.value = false
  }
}

const adminEmail = computed(() => adminData.value?.email || 'Admin')
const lastLogin = computed(() => {
  if (!adminData.value?.createdAt) return 'Unknown'
  return new Date(adminData.value.createdAt).toLocaleDateString()
})
</script>

<template>
  <div class="settings-page">
    <div class="admin-header">
      <h1>Settings</h1>
      <button 
        class="btn primary" 
        type="button" 
        :disabled="saving"
        @click="saveSettings"
      >
        {{ saving ? 'Saving...' : 'Save Changes' }}
      </button>
    </div>

    <!-- Toast Messages -->
    <Transition name="toast">
      <div v-if="error" class="toast error">
        <span class="toast-icon">⚠️</span>
        <span>{{ error }}</span>
        <button class="toast-close" @click="error = ''">&times;</button>
      </div>
    </Transition>
    <Transition name="toast">
      <div v-if="success" class="toast success">
        <span class="toast-icon">✓</span>
        <span>{{ success }}</span>
        <button class="toast-close" @click="success = ''">&times;</button>
      </div>
    </Transition>

    <ErrorState
      v-if="settingsError"
      title="Could not load settings"
      :message="getErrorMessage(settingsError)"
      :retry="refresh"
    />

    <div class="settings-layout">
      <!-- Sidebar Tabs -->
      <nav class="settings-nav">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="['nav-item', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id"
        >
          <span class="nav-icon">{{ tab.icon }}</span>
          <span class="nav-label">{{ tab.label }}</span>
        </button>
      </nav>

      <!-- Content Area -->
      <div class="settings-content">
        <!-- General Settings -->
        <div v-show="activeTab === 'general'" class="settings-panel">
          <div class="panel-header">
            <h2>General Settings</h2>
            <p class="panel-desc">Configure your store's basic information and branding.</p>
          </div>

          <div class="card">
            <h3>Logo</h3>
            <div class="logo-section">
              <div class="logo-preview">
                <img v-if="form.logo" :src="form.logo" alt="Site logo" />
                <div v-else class="logo-placeholder">
                  <span class="placeholder-icon">🖼️</span>
                  <span>No logo uploaded</span>
                </div>
              </div>
              <div class="logo-info">
                <p>Your logo appears in the header and emails.</p>
                <p class="hint">Recommended: PNG or SVG, 400×100px</p>
                <div class="logo-actions">
                  <label class="btn secondary">
                    <input type="file" accept="image/*" hidden @change="uploadLogo" />
                    {{ uploading ? 'Uploading...' : 'Upload Logo' }}
                  </label>
                  <button v-if="form.logo" type="button" class="btn ghost danger-text" @click="removeLogo">
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <h3>Store Information</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Store Name</label>
                <input v-model="form.siteName" type="text" placeholder="Auto Electronics" />
                <p class="hint">Displayed in browser tabs and headers</p>
              </div>
              <div class="form-group">
                <label>Default Currency</label>
                <CustomSelect 
                  v-model="form.currency" 
                  :options="[
                    { value: 'KES', label: 'KES - Kenyan Shilling' },
                    { value: 'UGX', label: 'UGX - Ugandan Shilling' },
                    { value: 'TZS', label: 'TZS - Tanzanian Shilling' },
                    { value: 'NGN', label: 'NGN - Nigerian Naira' },
                    { value: 'USD', label: 'USD - US Dollar' },
                  ]"
                />
              </div>
            </div>
          </div>

          <div class="card">
            <h3>Delivery Note</h3>
            <div class="form-group">
              <label>Custom Delivery Message</label>
              <textarea 
                v-model="form.deliveryNote" 
                rows="3" 
                placeholder="e.g., Free delivery within Nairobi. Other areas may have additional charges."
              ></textarea>
              <p class="hint">Shown on product pages and checkout</p>
            </div>
          </div>
        </div>

        <!-- Contact Settings -->
        <div v-show="activeTab === 'contact'" class="settings-panel">
          <div class="panel-header">
            <h2>Contact Information</h2>
            <p class="panel-desc">How customers can reach you.</p>
          </div>

          <div class="card">
            <h3>WhatsApp</h3>
            <div class="form-group">
              <label>WhatsApp Number</label>
              <div class="input-with-icon">
                <span class="input-icon">📱</span>
                <input v-model="form.whatsappNumber" type="tel" placeholder="254700000000" />
              </div>
              <p class="hint">Include country code without + or spaces (e.g., 254700000000)</p>
            </div>
            <div v-if="form.whatsappNumber" class="preview-box">
              <span class="preview-label">Preview:</span>
              <a :href="`https://wa.me/${form.whatsappNumber}`" target="_blank" class="whatsapp-preview">
                <span>💬</span> Chat on WhatsApp
              </a>
            </div>
          </div>

          <div class="card">
            <h3>Email Support</h3>
            <div class="form-group">
              <label>Support Email</label>
              <div class="input-with-icon">
                <span class="input-icon">✉️</span>
                <input v-model="form.supportEmail" type="email" placeholder="support@autoelectronics.co.ke" />
              </div>
              <p class="hint">Customers can email you here for support</p>
            </div>
          </div>
        </div>

        <!-- Social Links -->
        <div v-show="activeTab === 'social'" class="settings-panel">
          <div class="panel-header">
            <h2>Social Media Links</h2>
            <p class="panel-desc">Connect your social media accounts.</p>
          </div>

          <div class="card">
            <div class="social-grid">
              <div class="form-group">
                <label>
                  <span class="social-icon facebook">f</span>
                  Facebook
                </label>
                <input v-model="form.socialFacebook" type="url" placeholder="https://facebook.com/yourpage" />
              </div>
              <div class="form-group">
                <label>
                  <span class="social-icon instagram">📷</span>
                  Instagram
                </label>
                <input v-model="form.socialInstagram" type="url" placeholder="https://instagram.com/yourpage" />
              </div>
              <div class="form-group">
                <label>
                  <span class="social-icon twitter">𝕏</span>
                  Twitter / X
                </label>
                <input v-model="form.socialTwitter" type="url" placeholder="https://x.com/yourhandle" />
              </div>
            </div>
          </div>
        </div>

        <!-- Account Settings -->
        <div v-show="activeTab === 'account'" class="settings-panel">
          <div class="panel-header">
            <h2>Admin Account</h2>
            <p class="panel-desc">Manage your admin session and security.</p>
          </div>

          <div class="card">
            <h3>Current Session</h3>
            <div class="account-details">
              <div class="account-row">
                <span class="account-label">Email</span>
                <span class="account-value">{{ adminEmail }}</span>
              </div>
              <div class="account-row">
                <span class="account-label">Authentication</span>
                <span class="account-value">
                  <span class="badge success">2FA Enabled</span>
                </span>
              </div>
              <div class="account-row">
                <span class="account-label">Account Created</span>
                <span class="account-value">{{ lastLogin }}</span>
              </div>
            </div>
          </div>

          <div class="card danger-zone">
            <h3>Session</h3>
            <p>Logging out will end your current session. You'll need to re-authenticate with your email and authenticator app.</p>
            <button type="button" class="btn danger" @click="showLogoutConfirm = true">
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Logout Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showLogoutConfirm" class="modal-overlay" @click.self="showLogoutConfirm = false">
        <div class="modal">
          <h3>Logout</h3>
          <p>Are you sure you want to logout? You'll need to re-authenticate to access the admin panel.</p>
          <div class="modal-actions">
            <button class="btn secondary" @click="showLogoutConfirm = false">Cancel</button>
            <button class="btn danger" @click="logout">Logout</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.settings-page {
  max-width: 1200px;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Toast Notifications */
.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  font-size: 14px;
}

.toast.error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
}

.toast.success {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #6ee7b7;
}

.toast-icon {
  font-size: 18px;
}

.toast-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  opacity: 0.6;
  padding: 0 0 0 8px;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* Layout */
.settings-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 32px;
  margin-top: 24px;
}

/* Sidebar Navigation */
.settings-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: sticky;
  top: 100px;
  height: fit-content;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: none;
  background: transparent;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  text-align: left;
  transition: all 0.15s;
}

.nav-item:hover {
  background: var(--chip);
}

.nav-item.active {
  background: var(--ink);
  color: var(--bg);
}

.nav-icon {
  font-size: 18px;
}

/* Content Area */
.settings-content {
  min-height: 500px;
}

.settings-panel {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.panel-header {
  margin-bottom: 24px;
}

.panel-header h2 {
  font-size: 22px;
  margin: 0 0 6px;
}

.panel-desc {
  color: var(--muted);
  margin: 0;
  font-size: 14px;
}

/* Cards */
.card {
  padding: 24px;
  margin-bottom: 20px;
}

.card h3 {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 16px;
  color: var(--ink);
}

/* Logo Section */
.logo-section {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.logo-preview {
  width: 200px;
  height: 100px;
  border: 2px dashed var(--line);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--chip);
  flex-shrink: 0;
}

.logo-preview img {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
}

.logo-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 13px;
}

.placeholder-icon {
  font-size: 32px;
  opacity: 0.5;
}

.logo-info {
  flex: 1;
}

.logo-info p {
  margin: 0 0 8px;
  font-size: 14px;
}

.logo-actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

/* Form Grid */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

/* Input with Icon */
.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 12px;
  font-size: 16px;
}

.input-with-icon input {
  padding-left: 40px;
}

/* Preview Box */
.preview-box {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding: 12px 16px;
  background: var(--chip);
  border-radius: 8px;
}

.preview-label {
  font-size: 12px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.whatsapp-preview {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #25d366;
  color: white;
  border-radius: 20px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
}

/* Social Grid */
.social-grid {
  display: grid;
  gap: 20px;
}

.social-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 700;
  margin-right: 8px;
}

.social-icon.facebook {
  background: #1877f2;
  color: white;
}

.social-icon.instagram {
  background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
  color: white;
}

.social-icon.twitter {
  background: #000;
  color: white;
}

/* Account Details */
.account-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.account-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
}

.account-row:last-child {
  border-bottom: none;
}

.account-label {
  font-size: 14px;
  color: var(--muted);
}

.account-value {
  font-size: 14px;
  font-weight: 500;
}

.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.badge.success {
  background: #d1fae5;
  color: #065f46;
}

/* Danger Zone */
.danger-zone {
  border: 1px solid #fca5a5;
  background: #fef2f2;
}

.danger-zone h3 {
  color: #991b1b;
}

.danger-zone p {
  font-size: 14px;
  color: #7f1d1d;
  margin: 0 0 16px;
}

/* Buttons */
.btn.secondary {
  background: var(--chip);
  color: var(--ink);
  border: 1px solid var(--line);
}

.btn.danger {
  background: #dc2626;
  color: white;
}

.btn.danger:hover {
  background: #b91c1c;
}

.btn.ghost.danger-text {
  color: #dc2626;
}

.btn.ghost.danger-text:hover {
  background: #fee2e2;
}

/* Hints */
.hint {
  font-size: 12px;
  color: var(--muted);
  margin-top: 6px;
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
  margin: 0 0 20px;
  color: var(--text);
  font-size: 14px;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

/* Responsive */
@media (max-width: 800px) {
  .settings-layout {
    grid-template-columns: 1fr;
  }
  
  .settings-nav {
    flex-direction: row;
    overflow-x: auto;
    position: static;
    padding-bottom: 8px;
  }
  
  .nav-item {
    white-space: nowrap;
  }
  
  .nav-label {
    display: none;
  }
  
  .logo-section {
    flex-direction: column;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
