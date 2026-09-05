<script setup lang="ts">
const route = useRoute()
const adminPath = useState<string>('adminPath')
const { formatMoney, formatDate, formatMoneyList } = useFormat()
const { getCountryFlag, getCountryCurrency, countryOptions } = useCountries()
const { getErrorMessage } = useApiError()

const days = ref(30)
const extraCountry = ref('')
const applyToEmpty = ref(true)
const rateDraft = reactive<Record<string, string>>({})
const savingRates = ref(false)
const ratesError = ref('')
const ratesSuccess = ref('')
const listFilter = ref('')

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
  key: 'admin-ad-spends',
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

const spendProductOptions = computed(() =>
  ((products.value || []) as { productId: string; productName: string; country?: string }[]).map((product) => ({
    value: product.productId,
    label: `${product.productName} · ${product.country || 'Kenya'}`,
  })),
)

const currencyOptions = computed(() => {
  const codes = new Set(['KES', 'ZMW', 'USD'])
  for (const product of (products.value || []) as { currency?: string }[]) {
    if (product.currency) codes.add(product.currency)
  }
  return [...codes].sort().map((value) => ({ value, label: value }))
})

type SpendRow = {
  id: number
  productId: string
  productName: string
  amount: number
  currency: string
  spentOn: string
  note: string | null
}

const groupedSpends = computed(() => {
  const groups = new Map<string, { productId: string; productName: string; entries: SpendRow[] }>()
  for (const spend of (spendsData.value?.spends || []) as SpendRow[]) {
    if (listFilter.value && spend.productId !== listFilter.value) continue
    const current = groups.get(spend.productId) || {
      productId: spend.productId,
      productName: spend.productName || spend.productId,
      entries: [],
    }
    current.entries.push(spend)
    groups.set(spend.productId, current)
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      entries: [...group.entries].sort((a, b) => String(b.spentOn).localeCompare(String(a.spentOn)) || b.id - a.id),
    }))
    .sort((a, b) => {
      const latestA = a.entries[0]?.spentOn || ''
      const latestB = b.entries[0]?.spentOn || ''
      return latestB.localeCompare(latestA) || a.productName.localeCompare(b.productName)
    })
})

const listFilterOptions = computed(() => {
  const seen = new Map<string, string>()
  for (const spend of (spendsData.value?.spends || []) as SpendRow[]) {
    seen.set(spend.productId, spend.productName || spend.productId)
  }
  return [
    { value: '', label: 'All products' },
    ...[...seen.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label })),
  ]
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

function groupTotal(entries: SpendRow[]) {
  const byCurrency = new Map<string, number>()
  for (const entry of entries) {
    byCurrency.set(entry.currency, (byCurrency.get(entry.currency) || 0) + Number(entry.amount || 0))
  }
  return formatMoneyList([...byCurrency.entries()].map(([currency, amount]) => ({ currency, amount })))
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
          <p class="sub">Collected minus delivery and ads</p>
        </div>
      </div>

      <div class="split">
        <div class="card">
          <h2>Delivery rates</h2>
          <p class="note">One courier cost per country. New orders pick it up automatically. You can still override a single order.</p>

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
          <p class="note">Add what you spent on a product. The list below keeps every product’s entries visible.</p>
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
          <div>
            <h2>Ad entries</h2>
            <p class="note tight">Grouped by product, newest first.</p>
          </div>
          <CustomSelect
            v-if="listFilterOptions.length > 2"
            v-model="listFilter"
            :options="listFilterOptions"
            placeholder="All products"
          />
        </div>

        <div v-if="groupedSpends.length" class="groups">
          <section v-for="group in groupedSpends" :key="group.productId" class="spend-group">
            <header class="group-head">
              <div>
                <NuxtLink :to="`/a/${adminPath}/products/${group.productId}`" class="product-link">
                  {{ group.productName }}
                </NuxtLink>
                <p class="muted">{{ group.entries.length }} {{ group.entries.length === 1 ? 'entry' : 'entries' }}</p>
              </div>
              <strong>{{ groupTotal(group.entries) }}</strong>
            </header>
            <ul class="entry-list">
              <li v-for="spend in group.entries" :key="spend.id" class="entry">
                <div>
                  <p class="entry-amount">{{ formatMoney(spend.amount, spend.currency) }}</p>
                  <p class="muted">{{ formatDate(spend.spentOn) }}{{ spend.note ? ` · ${spend.note}` : '' }}</p>
                </div>
                <button
                  class="action-link delete"
                  type="button"
                  :disabled="deletingSpend === spend.id"
                  @click="removeSpend(spend.id)"
                >
                  {{ deletingSpend === spend.id ? 'Removing…' : 'Remove' }}
                </button>
              </li>
            </ul>
          </section>
        </div>
        <p v-else class="empty">{{ listFilter ? 'No spend logged for that product yet.' : 'No ad spend logged yet.' }}</p>
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

.stat-card.hot .value {
  color: var(--danger);
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
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.note {
  margin: 0 0 16px;
}

.note.tight {
  margin: 0;
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

.groups {
  display: grid;
  gap: 16px;
}

.spend-group {
  border: 1px solid var(--line);
  border-radius: 14px;
  overflow: hidden;
  background: var(--bg);
}

.group-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 14px 16px;
  background: var(--chip);
}

.entry-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border-top: 1px solid var(--line);
}

.entry-amount {
  margin: 0;
  font-weight: 700;
  color: var(--ink);
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
  .card-header,
  .group-head {
    grid-template-columns: 1fr;
  }

  .card-header,
  .group-head {
    display: grid;
  }
}
</style>
