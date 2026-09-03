<script setup lang="ts">
import QRCode from 'qrcode'

definePageMeta({
  layout: 'auth',
})

useSeoMeta({
  robots: 'noindex, nofollow',
})

const router = useRouter()

const step = ref<'email' | 'setup' | 'verify'>('email')
const email = ref('')
const code = ref('')
const error = ref('')
const loading = ref(false)
const qrCodeUrl = ref('')
const totpSecret = ref('')
const { getErrorMessage } = useApiError()

async function checkEmail() {
  if (!email.value.trim()) {
    error.value = 'Email is required'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const result = await $fetch('/api/admin/check-email', {
      method: 'POST',
      body: { email: email.value.trim() },
    })

    if (result.requiresSetup) {
      // Generate TOTP secret and show QR
      const setupResult = await $fetch('/api/admin/setup-totp', {
        method: 'POST',
        body: { email: email.value.trim() },
      })

      totpSecret.value = setupResult.secret
      qrCodeUrl.value = await QRCode.toDataURL(setupResult.otpauthUrl)
      step.value = 'setup'
    } else {
      step.value = 'verify'
    }
  } catch (err: unknown) {
    error.value = getErrorMessage(err, 'Invalid email')
  } finally {
    loading.value = false
  }
}

async function verifyCode(isSetup = false) {
  if (code.value.length !== 6) {
    error.value = 'Enter a 6-digit code'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const result = await $fetch('/api/admin/verify-totp', {
      method: 'POST',
      body: {
        email: email.value.trim(),
        code: code.value,
        isSetup,
      },
    })

    // Redirect to admin dashboard
    await router.push(`/a/${result.adminPath}`)
  } catch (err: unknown) {
    error.value = getErrorMessage(err, 'Invalid code')
    code.value = ''
  } finally {
    loading.value = false
  }
}

function formatCode(e: Event) {
  const input = e.target as HTMLInputElement
  code.value = input.value.replace(/\D/g, '').slice(0, 6)
}
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <h1>Admin Access</h1>
      
      <!-- Step 1: Email -->
      <form v-if="step === 'email'" @submit.prevent="checkEmail">
        <p class="subtitle">Enter your admin email to continue.</p>
        
        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="admin@example.com"
            autocomplete="email"
            required
          />
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <button class="btn primary" type="submit" :disabled="loading">
          {{ loading ? 'Checking...' : 'Continue' }}
        </button>
      </form>

      <!-- Step 2: TOTP Setup -->
      <div v-else-if="step === 'setup'" class="setup-step">
        <p class="subtitle">Scan this QR code with your authenticator app.</p>
        
        <div class="qr-container">
          <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="QR Code for authenticator app" />
        </div>

        <details class="secret-details">
          <summary>Can't scan? Enter this code manually</summary>
          <code class="secret-code">{{ totpSecret }}</code>
        </details>

        <form @submit.prevent="verifyCode(true)">
          <div class="form-group">
            <label for="setup-code">Enter the 6-digit code from your app</label>
            <input
              id="setup-code"
              :value="code"
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="6"
              placeholder="000000"
              autocomplete="one-time-code"
              @input="formatCode"
            />
          </div>

          <p v-if="error" class="error">{{ error }}</p>

          <button class="btn primary" type="submit" :disabled="loading || code.length !== 6">
            {{ loading ? 'Verifying...' : 'Verify & Login' }}
          </button>
        </form>
      </div>

      <!-- Step 3: TOTP Verify -->
      <form v-else-if="step === 'verify'" @submit.prevent="verifyCode(false)">
        <p class="subtitle">Enter the code from your authenticator app.</p>
        
        <div class="form-group">
          <label for="verify-code">6-digit code</label>
          <input
            id="verify-code"
            :value="code"
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength="6"
            placeholder="000000"
            autocomplete="one-time-code"
            @input="formatCode"
          />
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <button class="btn primary" type="submit" :disabled="loading || code.length !== 6">
          {{ loading ? 'Verifying...' : 'Login' }}
        </button>

        <button class="text-link" type="button" @click="step = 'email'; code = ''; error = ''">
          Use a different email
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  width: 100%;
  max-width: 400px;
}

.login-card {
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 32px;
}

h1 {
  font-family: var(--display);
  font-size: 28px;
  margin: 0 0 8px;
  text-align: center;
}

.subtitle {
  color: var(--muted);
  text-align: center;
  margin: 0 0 24px;
  font-size: 14px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
}

.form-group input {
  width: 100%;
  font-size: 16px;
}

#setup-code,
#verify-code {
  font-family: var(--display);
  font-size: 24px;
  letter-spacing: 0.3em;
  text-align: center;
  padding: 16px;
}

.error {
  color: var(--danger);
  font-size: 14px;
  margin: 0 0 16px;
  text-align: center;
}

.btn {
  width: 100%;
  margin-bottom: 12px;
}

.text-link {
  display: block;
  width: 100%;
  background: none;
  border: none;
  color: var(--accent);
  font-size: 14px;
  cursor: pointer;
  text-align: center;
}

.text-link:hover {
  text-decoration: underline;
}

.qr-container {
  display: flex;
  justify-content: center;
  margin: 24px 0;
}

.qr-container img {
  width: 200px;
  height: 200px;
  border-radius: 12px;
}

.secret-details {
  margin-bottom: 24px;
  text-align: center;
}

.secret-details summary {
  cursor: pointer;
  color: var(--muted);
  font-size: 13px;
}

.secret-code {
  display: block;
  margin-top: 12px;
  padding: 12px;
  background: var(--chip);
  border-radius: 8px;
  font-size: 14px;
  word-break: break-all;
}

.setup-step form {
  margin-top: 24px;
}
</style>
