<script setup lang="ts">
const { formatMoney, formatDate, formatRelativeTime, orderStatusLabel } = useFormat()
const { getCountryFlag } = useCountries()
const adminPath = useState<string>('adminPath')
const { getErrorMessage } = useApiError()

const search = ref('')
const searchDebounced = ref('')
const status = ref('')
const country = ref('')
const page = ref(1)
const exportError = ref('')

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, (value) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    searchDebounced.value = value.trim()
    page.value = 1
  }, 250)
})

watch([status, country], () => {
  page.value = 1
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})

const queryParams = computed(() => {
  const params: Record<string, string | number> = { page: page.value, limit: 20 }
  if (status.value) params.status = status.value
  if (country.value) params.country = country.value
  if (searchDebounced.value) params.q = searchDebounced.value
  return params
})

const { data, error: ordersError, refresh } = await useFetch('/api/orders', {
  query: queryParams,
  watch: [queryParams],
})

const orders = computed(() => data.value?.orders || [])
const pagination = computed(() => data.value?.pagination || { page: 1, totalPages: 1, total: 0 })

const countryOptions = computed(() => [
  { value: '', label: 'All markets' },
  ...(data.value?.countries || []).map((name) => ({
    value: name,
    label: `${getCountryFlag(name)} ${name}`,
  })),
])

const statusChips = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Need a call' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'shipped', label: 'On the way' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

const hasFilters = computed(() => Boolean(search.value || status.value || country.value))

function clearFilters() {
  search.value = ''
  searchDebounced.value = ''
  status.value = ''
  country.value = ''
  page.value = 1
}

function prevPage() {
  if (page.value > 1) page.value--
}

function nextPage() {
  if (page.value < pagination.value.totalPages) page.value++
}

const dialCodes: Record<string, string> = {
  Kenya: '254',
  Zambia: '260',
  Uganda: '256',
  Tanzania: '255',
  Nigeria: '234',
  Ghana: '233',
}

function customerWhatsapp(phone: string, country?: string | null) {
  const digits = phone.replace(/[^\d]/g, '')
  if (!digits) return ''
  if (phone.trim().startsWith('+')) return `https://wa.me/${digits}`
  if (digits.startsWith('0') && country && dialCodes[country]) {
    return `https://wa.me/${dialCodes[country]}${digits.slice(1)}`
  }
  return digits.length >= 10 ? `https://wa.me/${digits}` : ''
}

async function exportCsv() {
  exportError.value = ''
  try {
    const allOrders = await $fetch('/api/orders', {
      query: { ...queryParams.value, page: 1, limit: 2000 },
    })

    const headers = ['Order ID', 'Customer', 'Phone', 'City', 'Country', 'Product', 'Package', 'Qty', 'Total', 'Status', 'Device', 'Risk', 'Order Date', 'Delivery Date']
    const rows = allOrders.orders.map((order) => [
      order.orderId,
      order.customerName,
      order.primaryPhone,
      order.city,
      order.productCountry,
      order.productName,
      order.package,
      order.quantity,
      order.totalPrice,
      order.status,
      keverdDeviceLabel(order) || '',
      order.keverdError
        ? `${keverdErrorWhere(order.keverdErrorStage)}: ${order.keverdError}`
        : (isKeverdRisky(order.keverdAction, order.keverdRiskScore) ? 'risky' : (order.keverdAction || order.keverdRiskScore != null ? 'clear' : '')),
      new Date(order.orderDate).toISOString().split('T')[0],
      order.deliveryDate,
    ])

    const csv = [headers.join(','), ...rows.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `orders-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    exportError.value = getErrorMessage(err, 'Could not export orders')
  }
}

const rangeLabel = computed(() => {
  if (!pagination.value.total) return 'No orders'
  const start = (pagination.value.page - 1) * (Number(queryParams.value.limit) || 20) + 1
  const end = start + orders.value.length - 1
  return `${start}–${end} of ${pagination.value.total}`
})
</script>

<template>
  <div class="orders-page">
    <div class="admin-header">
      <div>
        <h1>Orders</h1>
        <p class="lede">{{ rangeLabel }}. Search a name, phone, city, or order ID.</p>
      </div>
      <button class="btn ghost" type="button" @click="exportCsv">Export CSV</button>
    </div>

    <p v-if="exportError" class="error-banner">{{ exportError }}</p>

    <ErrorState
      v-if="ordersError"
      title="Could not load orders"
      :message="getErrorMessage(ordersError)"
      :retry="refresh"
    />

    <template v-else>
      <div class="toolbar">
        <input
          v-model="search"
          class="search"
          type="search"
          placeholder="Name, phone, city, or order ID"
        >
        <CustomSelect
          v-model="country"
          :options="countryOptions"
          placeholder="All markets"
        />
      </div>

      <div class="chips" role="group" aria-label="Order status">
        <button
          v-for="chip in statusChips"
          :key="chip.value || 'all'"
          type="button"
          :class="{ active: status === chip.value }"
          @click="status = chip.value"
        >
          {{ chip.label }}
        </button>
      </div>

      <div v-if="orders.length" class="list">
        <article v-for="order in orders" :key="order.orderId" class="list-card">
          <div class="main">
            <div class="title-row">
              <NuxtLink :to="`/a/${adminPath}/orders/${order.orderId}`" class="order-id">
                {{ order.orderId }}
              </NuxtLink>
              <span :class="['status-badge', order.status]">{{ orderStatusLabel(order.status) }}</span>
            </div>
            <p class="customer">{{ order.customerName }}</p>
            <p class="meta">
              <a :href="`tel:${order.primaryPhone}`">{{ order.primaryPhone }}</a>
              · {{ order.city }}
              · {{ getCountryFlag(order.productCountry || 'Kenya') }} {{ order.productCountry || 'Kenya' }}
            </p>
            <p class="product">
              {{ order.quantity > 1 ? `${order.quantity} × ` : '' }}{{ order.package }} {{ order.productName }}
            </p>
          </div>

          <div class="aside">
            <p class="price">{{ formatMoney(order.totalPrice, order.currency) }}</p>
            <p class="when">{{ formatRelativeTime(order.orderDate) }} · {{ formatDate(order.deliveryDate) }} delivery</p>
            <div class="flags">
              <span
                v-if="keverdDeviceLabel(order)"
                :class="['status-badge', keverdDeviceLabel(order)]"
              >
                {{ keverdDeviceLabel(order) === 'repeat' ? 'Repeat buyer' : 'New device' }}
                <template v-if="(order.keverdOrderCount || 0) > 1"> · {{ order.keverdOrderCount }}</template>
              </span>
              <span v-if="isKeverdRisky(order.keverdAction, order.keverdRiskScore)" class="status-badge risky">Risky</span>
              <span
                v-if="order.keverdError"
                class="status-badge error"
                :title="`${keverdErrorWhere(order.keverdErrorStage)}: ${order.keverdError}`"
              >Device error</span>
            </div>
            <div class="actions">
              <a class="btn ghost btn-sm" :href="`tel:${order.primaryPhone}`">Call</a>
              <a
                v-if="customerWhatsapp(order.primaryPhone, order.productCountry)"
                class="btn ghost btn-sm"
                :href="customerWhatsapp(order.primaryPhone, order.productCountry)"
                target="_blank"
                rel="noopener"
              >
                WhatsApp
              </a>
              <NuxtLink :to="`/a/${adminPath}/orders/${order.orderId}`" class="btn primary btn-sm">
                Open
              </NuxtLink>
            </div>
          </div>
        </article>
      </div>

      <div v-else class="empty-card">
        <p v-if="hasFilters">No orders match that search.</p>
        <p v-else>No orders yet. They will land here when a customer checks out.</p>
        <button v-if="hasFilters" class="btn ghost" type="button" @click="clearFilters">Clear search</button>
      </div>

      <div v-if="pagination.totalPages > 1" class="pagination">
        <button type="button" :disabled="page === 1" @click="prevPage">Newer</button>
        <span>Page {{ page }} of {{ pagination.totalPages }}</span>
        <button type="button" :disabled="page === pagination.totalPages" @click="nextPage">Older</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.orders-page {
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
  margin-bottom: 12px;
}

.search {
  flex: 1 1 280px;
  min-width: 220px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 20px;
  padding: 4px;
  background: var(--chip);
  border-radius: 999px;
  width: fit-content;
  max-width: 100%;
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
  grid-template-columns: 1fr auto;
  gap: 20px;
  align-items: start;
  padding: 18px;
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: 16px;
}

.title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
  margin-bottom: 6px;
}

.order-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  text-decoration: none;
}

.order-id:hover {
  text-decoration: underline;
}

.customer {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--ink);
}

.meta,
.product,
.when {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 13px;
}

.meta a {
  color: inherit;
  text-decoration: none;
}

.meta a:hover {
  color: var(--accent);
  text-decoration: underline;
}

.product {
  color: var(--ink);
  font-weight: 500;
}

.aside {
  text-align: right;
  min-width: 220px;
}

.price {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--ink);
}

.flags {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 8px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.btn-sm {
  min-height: 40px;
  padding: 0 14px;
  font-size: 13px;
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

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
}

.pagination button {
  padding: 8px 16px;
  border: 1px solid var(--line);
  background: var(--bg);
  border-radius: 999px;
  cursor: pointer;
  font-weight: 600;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination span {
  font-size: 14px;
  color: var(--muted);
}

@media (max-width: 720px) {
  .list-card,
  .aside {
    grid-template-columns: 1fr;
    text-align: left;
    min-width: 0;
  }

  .flags,
  .actions {
    justify-content: flex-start;
  }

  .chips {
    border-radius: 16px;
  }
}
</style>
