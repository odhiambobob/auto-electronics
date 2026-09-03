<script setup lang="ts">
const { data: settings, refresh } = await useFetch('/api/settings')

const saving = ref(false)
const uploading = ref(false)
const error = ref('')
const success = ref('')

const form = reactive({
  logo: '',
  siteName: '',
  whatsappNumber: '',
})

watch(settings, (s) => {
  if (s) {
    form.logo = (s.logo as string) || ''
    form.siteName = (s.siteName as string) || ''
    form.whatsappNumber = (s.whatsappNumber as string) || ''
  }
}, { immediate: true })

async function uploadLogo(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    
    const result = await $fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })
    
    form.logo = result.url
  } catch (err) {
    console.error('Upload failed:', err)
    error.value = 'Failed to upload logo'
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
    success.value = 'Settings saved successfully'
  } catch (err: any) {
    error.value = err.data?.message || 'Failed to save settings'
  } finally {
    saving.value = false
  }
}

// Admin logout
const router = useRouter()

async function logout() {
  await $fetch('/api/admin/logout', { method: 'POST' })
  await router.push('/admin-login')
}
</script>

<template>
  <div class="settings-page">
    <div class="admin-header">
      <h1>Settings</h1>
    </div>

    <form @submit.prevent="saveSettings">
      <div class="settings-grid">
        <div class="card">
          <h2>Site Branding</h2>
          
          <div class="form-group">
            <label>Logo</label>
            <div class="logo-preview">
              <img v-if="form.logo" :src="form.logo" alt="Site logo" />
              <div v-else class="logo-placeholder">No logo</div>
            </div>
            <div class="logo-actions">
              <label class="btn ghost">
                <input type="file" accept="image/*" hidden @change="uploadLogo" />
                {{ uploading ? 'Uploading...' : 'Upload Logo' }}
              </label>
              <button v-if="form.logo" type="button" class="btn danger" @click="removeLogo">
                Remove
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>Site Name</label>
            <input v-model="form.siteName" type="text" placeholder="Auto Electronics" />
          </div>
        </div>

        <div class="card">
          <h2>Contact</h2>
          
          <div class="form-group">
            <label>WhatsApp Number</label>
            <input v-model="form.whatsappNumber" type="tel" placeholder="254700000000" />
            <p class="hint">Include country code without + or spaces</p>
          </div>
        </div>

        <div class="card">
          <h2>Admin Account</h2>
          
          <p class="account-info">You are logged in as an admin.</p>
          
          <button type="button" class="btn danger" @click="logout">
            Logout
          </button>
        </div>
      </div>

      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="success" class="success">{{ success }}</p>

      <div class="form-actions">
        <button class="btn primary" type="submit" :disabled="saving">
          {{ saving ? 'Saving...' : 'Save Settings' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.settings-page {
  max-width: 800px;
}

.settings-grid {
  display: grid;
  gap: 24px;
}

.card {
  padding: 24px;
}

.card h2 {
  font-size: 16px;
  margin: 0 0 16px;
}

.logo-preview {
  width: 200px;
  height: 80px;
  border: 1px solid var(--line);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  background: var(--bg);
}

.logo-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.logo-placeholder {
  color: var(--muted);
  font-size: 14px;
}

.logo-actions {
  display: flex;
  gap: 8px;
}

.hint {
  font-size: 12px;
  color: var(--muted);
  margin-top: 4px;
}

.account-info {
  color: var(--text);
  margin-bottom: 16px;
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
</style>
