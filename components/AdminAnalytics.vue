<script setup lang="ts">
const { formatMoney } = useFormat()
const adminPath = useState<string>('adminPath')

const days = ref(30)

const { data: analytics, error: analyticsError, refresh } = await useFetch('/api/analytics/earnings', {
  query: { days },
  watch: [days],
})
const { getErrorMessage } = useApiError()

const totalRevenue = computed(() => {
  if (!analytics.value?.dailyEarnings) return 0
  return analytics.value.dailyEarnings.reduce((sum, d) => sum + d.revenue, 0)
})

const totalOrders = computed(() => {
  if (!analytics.value?.dailyEarnings) return 0
  return analytics.value.dailyEarnings.reduce((sum, d) => sum + d.orderCount, 0)
})

const avgOrderValue = computed(() => {
  if (totalOrders.value === 0) return 0
  return Math.round(totalRevenue.value / totalOrders.value)
})

const chartLabels = computed(() => (analytics.value?.dailyEarnings || []).map((day) => day.date))
const chartSeries = computed(() => [
  {
    id: 'revenue',
    label: 'Revenue',
    color: '#1f4ed8',
    values: (analytics.value?.dailyEarnings || []).map((day) => day.revenue),
  },
  {
    id: 'orders',
    label: 'Orders',
    color: '#0f6b4c',
    values: (analytics.value?.dailyEarnings || []).map((day) => day.orderCount),
  },
])
</script>

<template>
  <div class="analytics-page">
    <div class="admin-header">
      <h1>Analytics</h1>
      <div class="period-selector">
        <button :class="{ active: days === 7 }" @click="days = 7">7 days</button>
        <button :class="{ active: days === 30 }" @click="days = 30">30 days</button>
        <button :class="{ active: days === 90 }" @click="days = 90">90 days</button>
      </div>
    </div>

    <ErrorState
      v-if="analyticsError"
      title="Could not load analytics"
      :message="getErrorMessage(analyticsError)"
      :retry="refresh"
    />

    <template v-else>
    <div class="stats-grid">
      <div class="stat-card">
        <p class="label">Total Revenue</p>
        <p class="value">{{ formatMoney(totalRevenue, 'KES') }}</p>
      </div>
      <div class="stat-card">
        <p class="label">Total Orders</p>
        <p class="value">{{ totalOrders }}</p>
      </div>
      <div class="stat-card">
        <p class="label">Avg Order Value</p>
        <p class="value">{{ formatMoney(avgOrderValue, 'KES') }}</p>
      </div>
      <div class="stat-card">
        <p class="label">Period</p>
        <p class="value">{{ days }} days</p>
      </div>
    </div>

    <div class="charts-grid">
      <div class="card">
        <h2>Daily Revenue</h2>
        <AdminLineChart
          v-if="analytics?.dailyEarnings?.length"
          :labels="chartLabels"
          :series="chartSeries"
        />
        <p v-else class="empty">No data for this period</p>
      </div>

      <div class="card">
        <h2>Top Products</h2>
        <table v-if="analytics?.topProducts?.length" class="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Sold</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="product in analytics.topProducts" :key="product.productId">
              <td>{{ product.productName }}</td>
              <td>{{ product.totalSold }}</td>
              <td>{{ formatMoney(product.revenue, 'KES') }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty">No data</p>
      </div>

      <div class="card">
        <h2>Revenue by City</h2>
        <table v-if="analytics?.revenueByCity?.length" class="data-table">
          <thead>
            <tr>
              <th>City</th>
              <th>Orders</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="city in analytics.revenueByCity" :key="city.city">
              <td>{{ city.city }}</td>
              <td>{{ city.orderCount }}</td>
              <td>{{ formatMoney(city.revenue, 'KES') }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty">No data</p>
      </div>

      <div class="card country-revenue">
        <h2>Revenue by Country</h2>
        <div v-if="analytics?.revenueByCountry?.length" class="country-cards">
          <div 
            v-for="item in analytics.revenueByCountry" 
            :key="item.country" 
            class="country-card"
          >
            <div class="country-name">{{ item.country }}</div>
            <div class="country-revenue-amount">{{ formatMoney(item.revenue, item.currency) }}</div>
            <div class="country-orders">{{ item.orderCount }} orders</div>
          </div>
        </div>
        <p v-else class="empty">No data - revenue will appear as orders are delivered</p>
      </div>

      <div class="card">
        <h2>Conversion Funnel</h2>
        <p class="funnel-link">
          <NuxtLink :to="`/a/${adminPath}/analytics/funnel`">
            View detailed dropoff analysis &rarr;
          </NuxtLink>
        </p>
      </div>
    </div>
    </template>
  </div>
</template>

<style scoped>
.analytics-page {
  max-width: 1200px;
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

.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.card h2 {
  font-size: 16px;
  margin: 0 0 16px;
}

.empty {
  color: var(--muted);
  text-align: center;
  padding: 32px;
}

.funnel-link {
  padding: 32px;
  text-align: center;
}

.funnel-link a {
  color: var(--accent);
  text-decoration: none;
  font-weight: 500;
}

.country-revenue {
  grid-column: span 2;
}

.country-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.country-card {
  padding: 16px;
  background: var(--chip);
  border-radius: 12px;
  text-align: center;
}

.country-name {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
  color: var(--ink);
}

.country-revenue-amount {
  font-size: 20px;
  font-weight: 700;
  color: var(--accent);
  margin-bottom: 4px;
}

.country-orders {
  font-size: 12px;
  color: var(--muted);
}

@media (max-width: 900px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
  
  .country-revenue {
    grid-column: span 1;
  }
}
</style>
