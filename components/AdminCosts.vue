<script setup lang="ts">
const route = useRoute()
const adminPath = useState<string>('adminPath')
const { formatMoney, formatCount, formatDate } = useFormat()
const { getCountryFlag, getCountryCurrency, countryOptions } = useCountries()
const { getErrorMessage } = useApiError()

const days = ref(30)
const extraCountry = ref('')
const applyToEmpty = ref(true)
const rateDraft = reactive<Record<string, string>>({})
const savingRates = ref(false)
const ratesError = ref('')
const ratesSuccess = ref('')

const spendForm = reactive({
  productId: typeof route.query.product === 'string' ? route.query.product : '',
  amount: '',
  currency: 'KES',
  spentOn: new Date().toISOString().slice(0, 10),
  note: '',
})
const savingSpend = ref(false)
const spendError = ref('')
const deletingSpend = ref<number | null>(null)

const { data: ratesData, error: ratesLoadError, refresh: refreshRates } = await useFetch('/api/admin/delivery-rates')
const { data: spendsData, error: spendsError, refresh: refreshSpends } = await useFetch('/api/admin/ad-spends', {
  query: computed(() => spendForm.productId ? { productId: spendForm.productId } : {}),
  watch: [() => spendForm.productId],
})
const { data: products, error: productsError } = await useFetch('/api/admin/products')
const { data: profit, error: profitError, refresh: refreshProfit } = await useFetch('/api/analytics/profit', {
  query: { days },
  watch: [days],
})

const pageError = computed(() => ratesLoadError.value || spendsError.value || productsError.value || profitError.value)

const totals = computed(() => profit.value?.totals || {
  collectedKes: 0,
  deliveryKes: 0,
  adsKes: 0,
  netKes: 0,
  roas: null as number | null,
})

const rateCountries = computed(() => {
  const names = new Set<string>()
  for (const row of ratesData.value?.countries || []) names.add(row.country)
  for (const country of Object.keys(rateDraft)) names.add(country)
  return [...names].sort((a, b) => a.localeCompare(b))
})

const unusedCountries = computed(() =>
  countryOptions.filter((option) => !rateCountries.value.includes(option.value)),
)

const productOptions = computed(() => [
  { value: '', label: 'All products' },
  ...((products.value || []) as { productId: string; productName: string; country?: string }[]).map((product) => ({
    value: product.productId,
    label: `${product.productName} · ${product.country || 'Kenya'}`,
  })),
])

const spendProductOptions = computed(() =>
  productOptions.value.filter((option) => option.value),
)

const currencyOptions = computed(() => {
  const codes = new Set(['KES', 'ZMW', 'USD'])
  for (const product of (products.value || []) as { currency?: string }[]) {
    if (product.currency) codes.add(product.currency)
  }
  return [...codes].sort().map((value) => ({ value, label: value }))
})

watch(ratesData, (data) => {
  if (!data) return
  for (const row of data.countries) {
    const saved = data.rates[row.country]
    if (rateDraft[row.country] == null) {
      rateDraft[row.country] = saved ? String(saved.amount) : ''
    }
  }
}, { immediate: true })

watch(() => spendForm.productId, (productId) => {
  const product = ((products.value || []) as { productId: string; currency?: string }[])
    .find((row) => row.productId === productId)
  if (product?.currency) spendForm.currency = product.currency
})

function addCountry() {
  if (!extraCountry.value || rateDraft[extraCountry.value] != null) return
  rateDraft[extraCountry.value] = ''
  extraCountry.value = ''
}

async function saveRates() {
  savingRates.value = true
  ratesError.value = ''
  ratesSuccess.value = ''
  try {
    const rates: Record<string, { amount: number; currency: string }> = {}
    for (const country of rateCountries.value) {
      const amount = Number(rateDraft[country])
      if (!Number.isFinite(amount) || amount < 0 || rateDraft[country] === '') continue
      rates[country] = {
        amount: Math.round(amount),
        currency: getCountryCurrency(country),
      }
    }
    const result = await $fetch('/api/admin/delivery-rates', {
      method: 'PUT',
      body: { rates, applyToEmpty: applyToEmpty.value },
    })
    ratesSuccess.value = result.applied
      ? `Saved. Filled ${result.applied} order${result.applied === 1 ? '' : 's'} that had no delivery cost.`
      : 'Delivery rates saved.'
    await Promise.all([refreshRates(), refreshProfit()])
  } catch (err) {
    ratesError.value = getErrorMessage(err, 'Could not save delivery rates')
  } finally {
    savingRates.value = false
  }
}

async function addSpend() {
  savingSpend.value = true
  spendError.value = ''
  try {
    const amount = Number(spendForm.amount)
    if (!spendForm.productId) throw new Error('Pick a product')
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter what you spent')
    await $fetch('/api/admin/ad-spends', {
      method: 'POST',
      body: {
        productId: spendForm.productId,
        amount: Math.round(amount),
        currency: spendForm.currency,
        spentOn: spendForm.spentOn,
        note: spendForm.note.trim() || undefined,
      },
    })
    spendForm.amount = ''
    spendForm.note = ''
    await Promise.all([refreshSpends(), refreshProfit()])
  } catch (err) {
    spendError.value = getErrorMessage(err, 'Could not save ad spend')
  } finally {
    savingSpend.value = false
  }
}

async function removeSpend(id: number) {
  deletingSpend.value = id
  spendError.value = ''
  try {
    await $fetch(`/api/admin/ad-spends/${id}`, { method: 'DELETE' })
    await Promise.all([refreshSpends(), refreshProfit()])
  } catch (err) {
    spendError.value = getErrorMessage(err, 'Could not delete that spend')
  } finally {
    deletingSpend.value = null
  }
}

function countryUnset(country: string) {
  return ratesData.value?.countries.find((row) => row.country === country)?.unset || 0
}
</script>

<template>
  <div class="costs-page">
    <div class="admin-header">
      <div>
        <h1>Costs</h1>
        <p class="lede">Courier rates and ad spend stay in admin. Customers still see the same pack prices.</p>
      </div>
      <div class="period-selector">
        <button :class="{ active: days === 7 }" @click="days = 7">7 days</button>
        <button :class="{ active: days === 30 }" @click="days = 30">30 days</button>
        <button :class="{ active: days === 90 }" @click="days = 90">90 days</button>
      </div>
    </div>

    <ErrorState
      v-if="pageError"
      title="Could not load costs"
      :message="getErrorMessage(pageError)"
      :retry="() => Promise.all([refreshRates(), refreshSpends(), refreshProfit()])"
    />

    <template v-else>
      <div class="stats-grid">
        <div class="stat-card">
          <p class="label">Collected</p>
          <p class="value money">{{ formatMoney(totals.collectedKes, 'KES') }}</p>
          <p class="sub">Delivered orders this period</p>
        </div>
        <div class="stat-card">
          <p class="label">Delivery</p>
          <p class="value money">{{ formatMoney(totals.deliveryKes, 'KES') }}</p>
          <p class="sub">Courier cost on delivered orders</p>
        </div>
        <div class="stat-card">
          <p class="label">Ads</p>
          <p class="value money">{{ formatMoney(totals.adsKes, 'KES') }}</p>
          <p class="sub">What you logged as spend</p>
        </div>
        <div class="stat-card" :class="{ good: totals.netKes > 0, hot: totals.netKes < 0 }">
          <p class="label">Net after costs</p>
          <p class="value money">{{ formatMoney(totals.netKes, 'KES') }}</p>
          <p class="sub">
            {{ totals.roas == null ? 'No ad spend in this period' : `ROAS ${totals.roas}x` }}
          </p>
        </div>
      </div>

      <div class="split">
        <div class="card">
          <h2>Delivery rates</h2>
          <p class="note">One courier cost per country, in that country’s currency. New orders pick it up automatically. You can still override a single order.</p>

          <div class="rate-list">
            <div v-for="country in rateCountries" :key="country" class="rate-row">
              <label>
                <span class="country-name">{{ getCountryFlag(country) }} {{ country }}</span>
                <span class="hint">{{ getCountryCurrency(country) }}{{ countryUnset(country) ? ` · ${countryUnset(country)} orders still using this default` : '' }}</span>
              </label>
              <input
                v-model="rateDraft[country]"
                type="number"
                min="0"
                step="1"
                :placeholder="`0 ${getCountryCurrency(country)}`"
              >
            </div>
          </div>

          <div v-if="unusedCountries.length" class="add-country">
            <CustomSelect v-model="extraCountry" :options="unusedCountries" placeholder="Add another country" />
            <button class="btn ghost" type="button" :disabled="!extraCountry" @click="addCountry">Add</button>
          </div>

          <label class="check">
            <input v-model="applyToEmpty" type="checkbox">
            Fill existing orders that do not have a delivery cost yet
          </label>

          <p v-if="ratesError" class="error-banner">{{ ratesError }}</p>
          <p v-if="ratesSuccess" class="success-banner">{{ ratesSuccess }}</p>
          <div class="form-actions">
            <button class="btn primary" type="button" :disabled="savingRates" @click="saveRates">
              {{ savingRates ? 'Saving…' : 'Save delivery rates' }}
            </button>
          </div>
        </div>

        <div class="card">
          <h2>Log ad spend</h2>
          <p class="note">Attach spend to a product so you can see if the ads are covering delivery and still leaving a profit.</p>
          <form @submit.prevent="addSpend">
            <div class="form-group">
              <label>Product</label>
              <CustomSelect v-model="spendForm.productId" :options="spendProductOptions" placeholder="Choose a product" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Amount</label>
                <input v-model="spendForm.amount" type="number" min="1" step="1" required>
              </div>
              <div class="form-group">
                <label>Currency</label>
                <CustomSelect v-model="spendForm.currency" :options="currencyOptions" />
              </div>
            </div>
            <div class="form-group">
              <label>Date spent</label>
              <input v-model="spendForm.spentOn" type="date" required>
            </div>
            <div class="form-group">
              <label>Note</label>
              <input v-model="spendForm.note" type="text" maxlength="500" placeholder="Meta, TikTok, boost…">
            </div>
            <p v-if="spendError" class="error-banner">{{ spendError }}</p>
            <div class="form-actions">
              <button class="btn primary" type="submit" :disabled="savingSpend">
                {{ savingSpend ? 'Saving…' : 'Add spend' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h2>Is it worth it?</h2>
          <CustomSelect v-model="spendForm.productId" :options="productOptions" placeholder="All products" />
        </div>
        <p class="note">Collected minus courier cost minus ads, in KES. Filter the table with the product picker.</p>
        <table v-if="profit?.products?.length" class="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th class="text-right">Delivered</th>
              <th class="text-right">Collected</th>
              <th class="text-right">Delivery</th>
              <th class="text-right">Ads</th>
              <th class="text-right">Net</th>
              <th class="text-right">ROAS</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in profit.products.filter((item) => !spendForm.productId || item.productId === spendForm.productId)"
              :key="row.productId"
            >
              <td>
                <NuxtLink :to="`/a/${adminPath}/products/${row.productId}`" class="product-link">
                  {{ row.productName }}
                </NuxtLink>
                <div class="muted">{{ getCountryFlag(row.country) }} {{ row.country }}</div>
              </td>
              <td class="text-right">{{ formatCount(row.delivered) }}</td>
              <td class="text-right">{{ formatMoney(row.collectedKes, 'KES') }}</td>
              <td class="text-right">{{ formatMoney(row.deliveryKes, 'KES') }}</td>
              <td class="text-right">{{ formatMoney(row.adsKes, 'KES') }}</td>
              <td class="text-right" :class="{ good: row.netKes > 0, hot: row.netKes < 0 }">
                <strong>{{ formatMoney(row.netKes, 'KES') }}</strong>
              </td>
              <td class="text-right">{{ row.roas == null ? '—' : `${row.roas}x` }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty">No delivered orders or ad spend in this period.</p>
        <p v-if="profit?.fx?.note" class="muted fx">{{ profit.fx.note }}</p>
      </div>

      <div class="card">
        <h2>Ad entries</h2>
        <table v-if="spendsData?.spends?.length" class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Product</th>
              <th class="text-right">Amount</th>
              <th>Note</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="spend in spendsData.spends" :key="spend.id">
              <td>{{ formatDate(spend.spentOn) }}</td>
              <td>
                <NuxtLink :to="`/a/${adminPath}/products/${spend.productId}`" class="product-link">
                  {{ spend.productName }}
                </NuxtLink>
              </td>
              <td class="text-right">{{ formatMoney(spend.amount, spend.currency) }}</td>
              <td class="muted">{{ spend.note || '—' }}</td>
              <td class="text-right">
                <button
                  class="action-link delete"
                  :disabled="deletingSpend === spend.id"
                  @click="removeSpend(spend.id)"
                >
                  {{ deletingSpend === spend.id ? 'Removing…' : 'Remove' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty">No ad spend logged yet.</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.costs-page {
  max-width: 1200px;
}

.lede,
.note,
.muted,
.sub,
.hint {
  color: var(--muted);
  font-size: 13px;
}

.lede {
  margin: 6px 0 0;
  max-width: 56ch;
}

.period-selector {
  display: flex;
  gap: 8px;
}

.period-selector button {
  padding: 8px 16px;
  border: 1px solid var(--line);
  background: var(--bg);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.period-selector button.active {
  background: var(--ink);
  color: var(--bg);
  border-color: var(--ink);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  padding: 18px;
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: 16px;
}

.stat-card.good .value {
  color: var(--good);
}

.stat-card.hot .value,
.hot {
  color: var(--danger);
}

.good {
  color: var(--good);
}

.stat-card .label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  margin: 0 0 6px;
}

.stat-card .value {
  font-size: 28px;
  font-weight: 700;
  font-family: var(--display);
  margin: 0;
}

.stat-card .value.money {
  font-size: 20px;
  line-height: 1.25;
}

.sub {
  margin: 6px 0 0;
}

.split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.card {
  margin-bottom: 24px;
}

.card h2 {
  font-size: 16px;
  margin: 0 0 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 8px;
}

.note {
  margin: 0 0 16px;
}

.rate-list {
  display: grid;
  gap: 12px;
  margin-bottom: 16px;
}

.rate-row {
  display: grid;
  grid-template-columns: 1fr 140px;
  gap: 12px;
  align-items: center;
}

.country-name {
  display: block;
  font-weight: 600;
}

.hint {
  display: block;
  margin-top: 2px;
}

.add-country {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  margin-bottom: 16px;
}

.check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  margin: 8px 0 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 120px;
  gap: 12px;
}

.text-right {
  text-align: right;
}

.product-link {
  color: var(--ink);
  font-weight: 600;
  text-decoration: none;
}

.product-link:hover {
  color: var(--accent);
}

.action-link {
  background: none;
  border: 0;
  color: var(--accent);
  cursor: pointer;
  font-size: 13px;
}

.action-link.delete {
  color: var(--danger);
}

.empty {
  color: var(--muted);
  text-align: center;
  padding: 32px;
}

.fx {
  margin: 12px 0 0;
}

.success-banner {
  background: #d1fae5;
  color: #065f46;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
}

@media (max-width: 900px) {
  .split,
  .rate-row,
  .form-row,
  .add-country,
  .card-header {
    grid-template-columns: 1fr;
  }

  .card-header {
    display: grid;
  }
}
</style>
