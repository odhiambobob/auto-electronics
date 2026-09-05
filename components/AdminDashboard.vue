<script setup lang="ts">
const { formatMoney, formatMoneyList, formatRelativeTime, formatCount, formatPercent, orderStatusLabel } = useFormat()
const adminPath = useState<string>('adminPath')
const { getErrorMessage } = useApiError()
const { getCountryFlag, getCountryCurrency } = useCountries()

const orderStatusFilter = ref('')
const countryFilter = ref('')
const periodFilter = ref('30')

const { data: ordersData, error: ordersError } = await useFetch('/api/orders', {
  query: { limit: 100 },
})
const { data: report, error: earningsError } = await useFetch('/api/analytics/earnings', {
  query: { days: periodFilter },
  watch: [periodFilter],
})
const { data: products, error: productsError } = await useFetch('/api/admin/products')
const dashboardError = computed(() => ordersError.value || earningsError.value || productsError.value)

const totals = computed(() => report.value?.totals || {
  orders: 0,
  booked: 0,
  pending: 0,
  inTransit: 0,
  delivered: 0,
  cancelled: 0,
  todayOrders: 0,
  cancelRate: 0,
  deliveryRate: 0,
  bookedKes: 0,
  collectedKes: 0,
  pendingKes: 0,
  deliveryKes: 0,
  adsKes: 0,
  netKes: 0,
})

const conversion = computed(() => report.value?.conversion || {
  visitors: 0,
  formStarted: 0,
  orders: 0,
  formRate: 0,
  orderRate: 0,
})

const allOrders = computed(() => ordersData.value?.orders || [])

const filteredOrders = computed(() => {
  let result = allOrders.value
  if (orderStatusFilter.value) {
    result = result.filter((order) => order.status === orderStatusFilter.value)
  }
  if (countryFilter.value) {
    result = result.filter((order) => (order.productCountry || 'Kenya') === countryFilter.value)
  }
  return result.slice(0, 10)
})

const productsByCountry = computed(() => {
  const countMap = new Map<string, { total: number; active: number; currency: string }>()
  for (const product of (products.value || []) as { country?: string; isActive?: boolean }[]) {
    const country = product.country || 'Kenya'
    const current = countMap.get(country) || { total: 0, active: 0, currency: getCountryCurrency(country) }
    current.total++
    if (product.isActive) current.active++
    countMap.set(country, current)
  }
  return countMap
})

function marketName(value?: string | null) {
  const country = (value || '').trim()
  return !country || country === 'Unknown' ? 'Kenya' : country
}

const countrySummary = computed(() => {
  const rows = new Map<string, {
    country: string
    currency: string
    total: number
    active: number
    orders: number
    pending: number
    booked: number
    collected: number
    bookedKes: number
    collectedKes: number
  }>()

  function rowFor(country: string, currency?: string) {
    const current = rows.get(country) || {
      country,
      currency: currency || getCountryCurrency(country),
      total: 0,
      active: 0,
      orders: 0,
      pending: 0,
      booked: 0,
      collected: 0,
      bookedKes: 0,
      collectedKes: 0,
    }
    if (currency) current.currency = currency
    rows.set(country, current)
    return current
  }

  for (const [country, data] of productsByCountry.value.entries()) {
    const current = rowFor(marketName(country), data.currency)
    current.total += data.total
    current.active += data.active
  }

  for (const item of report.value?.revenueByCountry || []) {
    const current = rowFor(marketName(item.country), item.currency)
    current.orders += Number(item.orders || item.orderCount || 0)
    current.pending += Number(item.pending || 0)
    current.booked += Number(item.booked || 0)
    current.collected += Number(item.collected || 0)
    current.bookedKes += Number(item.bookedKes || 0)
    current.collectedKes += Number(item.collectedKes || 0)
  }

  const cutoff = periodFilter.value === 'all'
    ? 0
    : Date.now() - Number(periodFilter.value) * 24 * 60 * 60 * 1000

  const local = new Map<string, { orders: number; pending: number; booked: number; collected: number; currency: string }>()
  for (const order of allOrders.value) {
    const when = new Date(order.orderDate).getTime()
    if (cutoff && Number.isFinite(when) && when < cutoff) continue
    const country = marketName(order.productCountry)
    const current = local.get(country) || { orders: 0, pending: 0, booked: 0, collected: 0, currency: order.currency }
    current.orders += 1
    if (order.status === 'pending') current.pending += 1
    if (order.status !== 'cancelled') current.booked += Number(order.totalPrice || 0)
    if (order.status === 'delivered') current.collected += Number(order.totalPrice || 0)
    local.set(country, current)
  }

  function applyLocal(statsByCountry: typeof local) {
    for (const [country, stats] of statsByCountry.entries()) {
      const current = rowFor(country, stats.currency)
      if (current.orders < stats.orders) {
        current.orders = stats.orders
        current.pending = stats.pending
        if (!current.booked) current.booked = stats.booked
        if (!current.collected) current.collected = stats.collected
      }
    }
  }

  applyLocal(local)

  const counted = [...rows.values()].reduce((sum, row) => sum + row.orders, 0)
  if (counted === 0 && allOrders.value.length) {
    const allVisible = new Map<string, { orders: number; pending: number; booked: number; collected: number; currency: string }>()
    for (const order of allOrders.value) {
      const country = marketName(order.productCountry)
      const current = allVisible.get(country) || { orders: 0, pending: 0, booked: 0, collected: 0, currency: order.currency }
      current.orders += 1
      if (order.status === 'pending') current.pending += 1
      if (order.status !== 'cancelled') current.booked += Number(order.totalPrice || 0)
      if (order.status === 'delivered') current.collected += Number(order.totalPrice || 0)
      allVisible.set(country, current)
    }
    applyLocal(allVisible)
  }

  return [...rows.values()].sort((a, b) => b.orders - a.orders || b.total - a.total)
})

const totalProducts = computed(() => (products.value || []).length)
const activeProducts = computed(() => ((products.value || []) as { isActive?: boolean }[]).filter((product) => product.isActive).length)

const countries = computed(() => {
  const set = new Set<string>()
  for (const row of countrySummary.value) set.add(row.country)
  return [...set].sort()
})

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

const countryOptions = computed(() => [
  { value: '', label: 'All Countries' },
  ...countries.value.map((country) => ({ value: country, label: `${getCountryFlag(country)} ${country}` })),
])

const periodOptions = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
]
</script>

<template>
  <div class="dashboard">
    <div class="admin-header">
      <h1>Dashboard</h1>
      <div class="header-filters">
        <CustomSelect v-model="periodFilter" :options="periodOptions" />
      </div>
    </div>

    <ErrorState
      v-if="dashboardError"
      title="Could not load dashboard data"
      :message="getErrorMessage(dashboardError)"
    />

    <template v-else>
    <div class="stats-grid">
      <div class="stat-card">
        <p class="label">Orders this period</p>
        <p class="value">{{ formatCount(totals.orders) }}</p>
        <p class="sub-stat">{{ formatCount(totals.todayOrders) }} today</p>
      </div>
      <div class="stat-card warning">
        <p class="label">Need a call</p>
        <p class="value">{{ formatCount(totals.pending) }}</p>
        <p class="sub-stat">{{ formatMoney(totals.pendingKes, 'KES') }} pending</p>
      </div>
      <div class="stat-card">
        <p class="label">In transit</p>
        <p class="value">{{ formatCount(totals.inTransit) }}</p>
        <p class="sub-stat">confirmed or shipped</p>
      </div>
      <div class="stat-card highlight">
        <p class="label">Collected</p>
        <p class="value money">{{ formatMoney(totals.collectedKes, 'KES') }}</p>
        <p class="sub-stat">{{ formatCount(totals.delivered) }} delivered · {{ formatPercent(totals.deliveryRate) }} of booked</p>
      </div>
      <div class="stat-card">
        <p class="label">Net after costs</p>
        <p class="value money">{{ formatMoney(totals.netKes || 0, 'KES') }}</p>
        <p class="sub-stat">
          {{ formatMoney(totals.deliveryKes || 0, 'KES') }} delivery · {{ formatMoney(totals.adsKes || 0, 'KES') }} ads
        </p>
      </div>
      <div class="stat-card">
        <p class="label">Booked value</p>
        <p class="value money">{{ formatMoney(totals.bookedKes, 'KES') }}</p>
        <p class="sub-stat">{{ formatMoneyList((report?.revenueByCurrency || []).map((row) => ({ amount: row.booked, currency: row.currency }))) }} local</p>
      </div>
      <div class="stat-card" :class="{ warning: totals.cancelRate >= 20 }">
        <p class="label">Cancel rate</p>
        <p class="value">{{ formatPercent(totals.cancelRate) }}</p>
        <p class="sub-stat">{{ formatCount(totals.cancelled) }} cancelled</p>
      </div>
    </div>

    <div class="card conversion">
      <div class="card-header">
        <h2>Store conversion</h2>
        <NuxtLink :to="`/a/${adminPath}/analytics/funnel`" class="view-all">Open dropoff →</NuxtLink>
      </div>
      <div class="conversion-row">
        <div>
          <strong>{{ formatCount(conversion.visitors) }}</strong>
          <span>visitors</span>
        </div>
        <span class="arrow">→</span>
        <div>
          <strong>{{ formatCount(conversion.formStarted) }}</strong>
          <span>started form · {{ formatPercent(conversion.formRate) }}</span>
        </div>
        <span class="arrow">→</span>
        <div>
          <strong>{{ formatCount(conversion.orders) }}</strong>
          <span>orders · {{ formatPercent(conversion.orderRate) }} of visitors</span>
        </div>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="card">
        <div class="card-header">
          <h2>Country performance</h2>
          <NuxtLink :to="`/a/${adminPath}/analytics`" class="view-all">Full analytics →</NuxtLink>
        </div>

        <table v-if="countrySummary.length" class="data-table compact">
          <thead>
            <tr>
              <th>Country</th>
              <th class="text-right">Products</th>
              <th class="text-right">Orders</th>
              <th class="text-right">Pending</th>
              <th class="text-right">Booked</th>
              <th class="text-right">Collected</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in countrySummary" :key="item.country">
              <td>
                <span class="country-cell">
                  <span class="flag">{{ getCountryFlag(item.country) }}</span>
                  {{ item.country }}
                </span>
              </td>
              <td class="text-right">
                <span class="product-count-cell">
                  {{ item.total }}
                  <span class="active-badge" :class="{ dim: item.active === 0 }">{{ item.active }} active</span>
                </span>
              </td>
              <td class="text-right">{{ item.orders }}</td>
              <td class="text-right">{{ item.pending }}</td>
              <td class="text-right">
                <strong>{{ formatMoney(item.bookedKes, 'KES') }}</strong>
                <div v-if="item.currency !== 'KES'" class="local-amount">{{ formatMoney(item.booked, item.currency) }}</div>
              </td>
              <td class="text-right">
                {{ formatMoney(item.collectedKes, 'KES') }}
                <div v-if="item.currency !== 'KES'" class="local-amount">{{ formatMoney(item.collected, item.currency) }}</div>
              </td>
            </tr>
          </tbody>
          <tfoot v-if="countrySummary.length > 1">
            <tr>
              <td><strong>Total</strong></td>
              <td class="text-right"><strong>{{ totalProducts }}</strong></td>
              <td class="text-right"><strong>{{ countrySummary.reduce((sum, row) => sum + row.orders, 0) }}</strong></td>
              <td class="text-right"><strong>{{ countrySummary.reduce((sum, row) => sum + row.pending, 0) }}</strong></td>
              <td class="text-right"><strong>{{ formatMoney(countrySummary.reduce((sum, row) => sum + row.bookedKes, 0), 'KES') }}</strong></td>
              <td class="text-right"><strong>{{ formatMoney(countrySummary.reduce((sum, row) => sum + row.collectedKes, 0), 'KES') }}</strong></td>
            </tr>
          </tfoot>
        </table>
        <p v-else class="empty">No products or orders yet. <NuxtLink :to="`/a/${adminPath}/products/new`">Add your first product</NuxtLink></p>
        <p v-if="report?.fx?.note" class="fx-note">{{ report.fx.note }}</p>
      </div>

      <div class="card quick-actions">
        <div class="card-header">
          <h2>Quick actions</h2>
        </div>
        <p class="markets">{{ countrySummary.length }} markets · {{ activeProducts }} active products</p>
        <div class="actions-grid">
          <NuxtLink :to="`/a/${adminPath}/orders`" class="action-btn">
            <span>Pending orders</span>
            <strong>{{ formatCount(totals.pending) }}</strong>
          </NuxtLink>
          <NuxtLink :to="`/a/${adminPath}/analytics/funnel`" class="action-btn">
            <span>Dropoff / reach-out</span>
            <strong>Open</strong>
          </NuxtLink>
          <NuxtLink :to="`/a/${adminPath}/products/new`" class="action-btn">
            <span>New product</span>
            <strong>+</strong>
          </NuxtLink>
          <NuxtLink :to="`/a/${adminPath}/costs`" class="action-btn">
            <span>Costs / ads</span>
            <strong>→</strong>
          </NuxtLink>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2>Recent orders</h2>
        <NuxtLink :to="`/a/${adminPath}/orders`" class="view-all">View all →</NuxtLink>
      </div>

      <div class="table-filters">
        <CustomSelect v-model="orderStatusFilter" :options="statusOptions" placeholder="All Statuses" />
        <CustomSelect v-model="countryFilter" :options="countryOptions" placeholder="All Countries" />
        <span class="filter-result">{{ filteredOrders.length }} shown</span>
      </div>

      <table v-if="filteredOrders.length" class="data-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Product</th>
            <th class="text-right">Total</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in filteredOrders" :key="order.orderId">
            <td>
              <NuxtLink :to="`/a/${adminPath}/orders/${order.orderId}`" class="order-link">
                {{ order.orderId }}
              </NuxtLink>
              <div class="date-cell">{{ formatRelativeTime(order.orderDate) }}</div>
            </td>
            <td>
              <strong>{{ order.customerName }}</strong>
              <div class="date-cell">
                {{ order.city }} · {{ getCountryFlag(order.productCountry || 'Kenya') }} {{ order.productCountry || 'Kenya' }}
              </div>
            </td>
            <td class="product-cell">{{ order.quantity > 1 ? `${order.quantity} × ` : '' }}{{ order.package }} {{ order.productName }}</td>
            <td class="text-right"><strong>{{ formatMoney(order.totalPrice, order.currency) }}</strong></td>
            <td>
              <span :class="['status-badge', order.status]">{{ orderStatusLabel(order.status) }}</span>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-else class="empty">No orders match your filters.</p>
    </div>
    </template>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 1400px;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.header-filters {
  display: flex;
  gap: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.view-all {
  font-size: 13px;
  color: var(--accent);
  text-decoration: none;
}

.view-all:hover {
  text-decoration: underline;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  padding: 20px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 12px;
}

.stat-card.highlight {
  background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 80%, #000));
  border: none;
  color: white;
}

.stat-card.highlight .label,
.stat-card.highlight .sub-stat {
  color: rgba(255,255,255,0.8);
}

.stat-card.warning .value {
  color: #d97706;
}

.stat-card .label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  margin: 0 0 4px;
}

.stat-card .value {
  font-size: 28px;
  font-weight: 700;
  font-family: var(--display);
  letter-spacing: -0.02em;
  margin: 0;
}

.stat-card .value.money {
  font-size: 20px;
  line-height: 1.25;
}

.sub-stat {
  font-size: 12px;
  color: var(--muted);
  margin: 4px 0 0;
}

.conversion {
  margin-bottom: 24px;
}

.conversion-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}

.conversion-row strong {
  display: block;
  font-size: 24px;
  color: var(--ink);
}

.conversion-row span {
  color: var(--muted);
  font-size: 13px;
}

.arrow {
  color: var(--line);
  font-size: 20px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.data-table.compact {
  font-size: 13px;
}

.data-table.compact th,
.data-table.compact td {
  padding: 10px 12px;
}

.text-right {
  text-align: right;
}

.country-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.country-cell .flag {
  font-size: 18px;
}

.product-count-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.active-badge {
  font-size: 10px;
  color: var(--good);
  font-weight: 500;
}

.active-badge.dim {
  color: var(--muted);
}

.data-table tfoot td {
  border-top: 2px solid var(--line);
  background: var(--chip);
}

.markets {
  margin: 0 0 12px;
  color: var(--muted);
  font-size: 13px;
}

.actions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.action-btn {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  background: var(--chip);
  border-radius: 12px;
  text-decoration: none;
  color: var(--ink);
  font-size: 13px;
}

.action-btn strong {
  font-size: 20px;
}

.table-filters {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: var(--chip);
  border-radius: 8px;
}

.filter-result {
  margin-left: auto;
  font-size: 13px;
  color: var(--muted);
}

.order-link {
  font-family: monospace;
  font-size: 12px;
  color: var(--accent);
  text-decoration: none;
}

.product-cell {
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.country-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 2px 8px;
  background: var(--chip);
  border-radius: 4px;
}

.date-cell {
  font-size: 13px;
  color: var(--muted);
  white-space: nowrap;
}

.empty {
  color: var(--muted);
  text-align: center;
  padding: 32px;
}

.empty a {
  color: var(--accent);
}

.local-amount,
.fx-note {
  font-size: 12px;
  color: var(--muted);
  font-weight: 400;
}

.fx-note {
  margin: 12px 0 0;
}

@media (max-width: 900px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .table-filters {
    flex-wrap: wrap;
  }
}

@media (max-width: 600px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .actions-grid {
    grid-template-columns: 1fr;
  }
}
</style>
