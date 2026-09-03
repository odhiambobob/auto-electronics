<script setup lang="ts">
const { formatMoney, formatDate } = useFormat()
const adminPath = useState<string>('adminPath')

// Filters
const orderStatusFilter = ref('')
const countryFilter = ref('')
const periodFilter = ref('30')

// Fetch dashboard stats
const { data: ordersData } = await useFetch('/api/orders', { query: { limit: 100 } })
const { data: analytics } = await useFetch('/api/analytics/overview')
const { data: earnings, refresh: refreshEarnings } = await useFetch('/api/analytics/earnings', { 
  query: computed(() => ({ days: parseInt(periodFilter.value) }))
})
const { data: products } = await useFetch('/api/admin/products')

// Watch period filter changes
watch(periodFilter, () => refreshEarnings())

const stats = computed(() => {
  if (!analytics.value) {
    return {
      totalOrders: 0,
      totalRevenue: 0,
      pendingOrders: 0,
      todayOrders: 0,
    }
  }
  return analytics.value
})

const allOrders = computed(() => ordersData.value?.orders || [])

// Filter orders
const filteredOrders = computed(() => {
  let result = allOrders.value as any[]
  
  if (orderStatusFilter.value) {
    result = result.filter(o => o.status === orderStatusFilter.value)
  }
  
  if (countryFilter.value) {
    result = result.filter(o => o.productCountry === countryFilter.value)
  }
  
  return result.slice(0, 10) // Show max 10 in dashboard
})

const revenueByCountry = computed(() => earnings.value?.revenueByCountry || [])

// Products by country with currency info
const productsByCountry = computed(() => {
  if (!products.value) return []
  const countMap = new Map<string, { total: number; active: number; currency: string }>()
  
  const currencyMap: Record<string, string> = {
    'Kenya': 'KES', 'Uganda': 'UGX', 'Tanzania': 'TZS', 'Rwanda': 'RWF',
    'Ethiopia': 'ETB', 'Nigeria': 'NGN', 'Ghana': 'GHS', 'South Africa': 'ZAR',
    'Egypt': 'EGP', 'Morocco': 'MAD', 'Global': 'USD',
  }
  
  for (const p of products.value as any[]) {
    const country = p.country || 'Kenya'
    const current = countMap.get(country) || { total: 0, active: 0, currency: currencyMap[country] || 'USD' }
    current.total++
    if (p.isActive) current.active++
    countMap.set(country, current)
  }
  
  return Array.from(countMap.entries())
    .map(([country, data]) => ({ country, ...data }))
    .sort((a, b) => b.total - a.total)
})

// Merge products and revenue by country
const countrySummary = computed(() => {
  const revenueMap = new Map(revenueByCountry.value.map(r => [r.country, r]))
  
  return productsByCountry.value.map(p => {
    const revenue = revenueMap.get(p.country)
    return {
      ...p,
      revenue: revenue?.revenue || 0,
      orderCount: revenue?.orderCount || 0,
    }
  })
})

const totalProducts = computed(() => products.value?.length || 0)
const activeProducts = computed(() => (products.value as any[] || []).filter(p => p.isActive).length)

// Get unique countries for filter
const countries = computed(() => {
  const set = new Set<string>()
  productsByCountry.value.forEach(p => set.add(p.country))
  return Array.from(set).sort()
})

// Filter options
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
  ...countries.value.map(c => ({ value: c, label: `${getCountryFlag(c)} ${c}` }))
])

const periodOptions = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
]

// Country flags
const countryFlags: Record<string, string> = {
  'Kenya': '🇰🇪',
  'Uganda': '🇺🇬',
  'Tanzania': '🇹🇿',
  'Rwanda': '🇷🇼',
  'Ethiopia': '🇪🇹',
  'Nigeria': '🇳🇬',
  'Ghana': '🇬🇭',
  'South Africa': '🇿🇦',
  'Egypt': '🇪🇬',
  'Morocco': '🇲🇦',
  'Global': '🌍',
}

function getCountryFlag(country: string): string {
  return countryFlags[country] || '🏳️'
}
</script>

<template>
  <div class="dashboard">
    <div class="admin-header">
      <h1>Dashboard</h1>
      <div class="header-filters">
        <CustomSelect v-model="periodFilter" :options="periodOptions" />
      </div>
    </div>

    <!-- Stats Overview -->
    <div class="stats-grid">
      <div class="stat-card">
        <p class="label">Total Orders</p>
        <p class="value">{{ stats.totalOrders }}</p>
      </div>
      <div class="stat-card highlight">
        <p class="label">Total Revenue</p>
        <p class="value">{{ formatMoney(stats.totalRevenue, 'KES') }}</p>
      </div>
      <div class="stat-card warning">
        <p class="label">Pending Orders</p>
        <p class="value">{{ stats.pendingOrders }}</p>
      </div>
      <div class="stat-card">
        <p class="label">Today's Orders</p>
        <p class="value">{{ stats.todayOrders }}</p>
      </div>
      <div class="stat-card">
        <p class="label">Products</p>
        <p class="value">{{ totalProducts }}</p>
        <p class="sub-stat">{{ activeProducts }} active</p>
      </div>
      <div class="stat-card">
        <p class="label">Markets</p>
        <p class="value">{{ productsByCountry.length }}</p>
        <p class="sub-stat">countries</p>
      </div>
    </div>

    <!-- Two Column Layout -->
    <div class="dashboard-grid">
      <!-- Country Summary Table -->
      <div class="card">
        <div class="card-header">
          <h2>Country Performance</h2>
          <NuxtLink :to="`/a/${adminPath}/analytics`" class="view-all">Full analytics →</NuxtLink>
        </div>
        
        <table v-if="countrySummary.length" class="data-table compact">
          <thead>
            <tr>
              <th>Country</th>
              <th class="text-right">Products</th>
              <th class="text-right">Orders</th>
              <th class="text-right">Revenue</th>
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
              <td class="text-right">{{ item.orderCount }}</td>
              <td class="text-right">
                <strong>{{ formatMoney(item.revenue, item.currency) }}</strong>
              </td>
            </tr>
          </tbody>
          <tfoot v-if="countrySummary.length > 1">
            <tr>
              <td><strong>Total</strong></td>
              <td class="text-right"><strong>{{ totalProducts }}</strong></td>
              <td class="text-right"><strong>{{ countrySummary.reduce((s, c) => s + c.orderCount, 0) }}</strong></td>
              <td class="text-right">—</td>
            </tr>
          </tfoot>
        </table>
        <p v-else class="empty">No products yet. <NuxtLink :to="`/a/${adminPath}/products/new`">Add your first product</NuxtLink></p>
      </div>

      <!-- Quick Actions -->
      <div class="card quick-actions">
        <div class="card-header">
          <h2>Quick Actions</h2>
        </div>
        <div class="actions-grid">
          <NuxtLink :to="`/a/${adminPath}/products/new`" class="action-btn">
            <span class="action-icon">➕</span>
            <span>New Product</span>
          </NuxtLink>
          <NuxtLink :to="`/a/${adminPath}/orders`" class="action-btn">
            <span class="action-icon">📦</span>
            <span>View Orders</span>
          </NuxtLink>
          <NuxtLink :to="`/a/${adminPath}/analytics`" class="action-btn">
            <span class="action-icon">📊</span>
            <span>Analytics</span>
          </NuxtLink>
          <NuxtLink :to="`/a/${adminPath}/settings`" class="action-btn">
            <span class="action-icon">⚙️</span>
            <span>Settings</span>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Recent Orders with Filters -->
    <div class="card">
      <div class="card-header">
        <h2>Recent Orders</h2>
        <NuxtLink :to="`/a/${adminPath}/orders`" class="view-all">View all →</NuxtLink>
      </div>
      
      <div class="table-filters">
        <CustomSelect v-model="orderStatusFilter" :options="statusOptions" placeholder="All Statuses" />
        <CustomSelect v-model="countryFilter" :options="countryOptions" placeholder="All Countries" />
        <span class="filter-result">{{ filteredOrders.length }} orders</span>
      </div>

      <table v-if="filteredOrders.length" class="data-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Product</th>
            <th>Country</th>
            <th class="text-right">Total</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in filteredOrders" :key="order.orderId">
            <td>
              <NuxtLink :to="`/a/${adminPath}/orders/${order.orderId}`" class="order-link">
                {{ order.orderId }}
              </NuxtLink>
            </td>
            <td>{{ order.customerName }}</td>
            <td class="product-cell">{{ order.package }} {{ order.productName }}</td>
            <td>
              <span class="country-badge">
                {{ getCountryFlag(order.productCountry || 'Kenya') }}
                {{ order.productCountry || 'Kenya' }}
              </span>
            </td>
            <td class="text-right"><strong>{{ formatMoney(order.totalPrice, order.currency) }}</strong></td>
            <td>
              <span :class="['status-badge', order.status]">{{ order.status }}</span>
            </td>
            <td class="date-cell">{{ formatDate(order.orderDate) }}</td>
          </tr>
        </tbody>
      </table>

      <p v-else class="empty">No orders match your filters.</p>
    </div>
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

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
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

.stat-card.highlight .label {
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

.sub-stat {
  font-size: 12px;
  color: var(--muted);
  margin: 4px 0 0;
}

/* Dashboard Grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

/* Tables */
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

/* Quick Actions */
.quick-actions {
  height: fit-content;
}

.actions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 16px;
  background: var(--chip);
  border-radius: 12px;
  text-decoration: none;
  color: var(--ink);
  font-size: 13px;
  font-weight: 500;
  transition: background-color 0.15s, transform 0.15s;
}

.action-btn:hover {
  background: var(--line);
  transform: translateY(-2px);
}

.action-icon {
  font-size: 24px;
}

/* Table Filters */
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

/* Order Table Cells */
.order-link {
  font-family: monospace;
  font-size: 12px;
  color: var(--accent);
  text-decoration: none;
}

.order-link:hover {
  text-decoration: underline;
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
