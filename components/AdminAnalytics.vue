<script setup lang="ts">
const { formatMoney, formatCount, formatPercent } = useFormat()
const adminPath = useState<string>('adminPath')
const { getCountryFlag } = useCountries()
const { getErrorMessage } = useApiError()

const days = ref(30)

const { data: report, error: analyticsError, refresh } = await useFetch('/api/analytics/earnings', {
  query: { days },
  watch: [days],
})
const { data: funnel } = await useFetch('/api/analytics/funnel', {
  query: { days },
  watch: [days],
})

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
  roas: null as number | null,
})

const conversion = computed(() => report.value?.conversion || {
  visitors: 0,
  formStarted: 0,
  orders: 0,
  formRate: 0,
  orderRate: 0,
})

const statusMax = computed(() => Math.max(1, ...(report.value?.status || []).map((row) => row.count)))

const chartLabels = computed(() => (report.value?.daily || []).map((day) => day.date))
const orderSeries = computed(() => [
  { id: 'orders', label: 'Placed', color: '#1f4ed8', values: (report.value?.daily || []).map((day) => day.orders) },
  { id: 'delivered', label: 'Delivered', color: '#0f6b4c', values: (report.value?.daily || []).map((day) => day.delivered) },
  { id: 'cancelled', label: 'Cancelled', color: '#dc2626', values: (report.value?.daily || []).map((day) => day.cancelled) },
])
const kesSeries = computed(() => [
  { id: 'booked', label: 'Booked KES', color: '#1f4ed8', values: (report.value?.daily || []).map((day) => day.bookedKes || 0) },
  { id: 'collected', label: 'Collected KES', color: '#0f6b4c', values: (report.value?.daily || []).map((day) => day.collectedKes || 0) },
])

const funnelSeries = computed(() => [
  {
    id: 'funnel',
    label: 'People',
    color: '#1f4ed8',
    values: (funnel.value?.funnel || []).map((stage) => stage.count),
  },
])
const funnelLabels = computed(() => (funnel.value?.funnel || []).map((stage) => ({
  page_view: 'Visit',
  product_view: 'Product',
  checkout_open: 'Checkout',
  form_started: 'Form',
  field_filled: 'Fields',
  order_submitted: 'Order',
}[stage.eventType] || stage.eventType)))
</script>

<template>
  <div class="analytics-page">
    <div class="admin-header">
      <div>
        <h1>Analytics</h1>
        <p class="lede">Orders placed, cash still sitting in COD, and where visitors drop before they buy.</p>
      </div>
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
          <p class="label">Orders placed</p>
          <p class="value">{{ formatCount(totals.orders) }}</p>
          <p class="sub">{{ formatCount(totals.todayOrders) }} today · {{ formatCount(totals.booked) }} still live</p>
        </div>
        <div class="stat-card">
          <p class="label">Pending cash</p>
          <p class="value money">{{ formatMoney(totals.pendingKes, 'KES') }}</p>
          <p class="sub">{{ formatCount(totals.pending) }} waiting for a call</p>
        </div>
        <div class="stat-card">
          <p class="label">Collected</p>
          <p class="value money">{{ formatMoney(totals.collectedKes, 'KES') }}</p>
          <p class="sub">{{ formatCount(totals.delivered) }} delivered · {{ formatPercent(totals.deliveryRate) }} of booked</p>
        </div>
        <div class="stat-card" :class="{ hot: (totals.netKes || 0) < 0 }">
          <p class="label">Net after costs</p>
          <p class="value money">{{ formatMoney(totals.netKes || 0, 'KES') }}</p>
          <p class="sub">
            {{ formatMoney(totals.deliveryKes || 0, 'KES') }} delivery · {{ formatMoney(totals.adsKes || 0, 'KES') }} ads
            <NuxtLink :to="`/a/${adminPath}/costs`">edit</NuxtLink>
          </p>
        </div>
        <div class="stat-card">
          <p class="label">Visitor → order</p>
          <p class="value">{{ formatPercent(conversion.orderRate) }}</p>
          <p class="sub">{{ formatCount(conversion.visitors) }} visitors · {{ formatCount(conversion.formStarted) }} started the form</p>
        </div>
        <div class="stat-card" :class="{ hot: totals.cancelRate >= 20 }">
          <p class="label">Cancel rate</p>
          <p class="value">{{ formatPercent(totals.cancelRate) }}</p>
          <p class="sub">{{ formatCount(totals.cancelled) }} failed COD / cancelled</p>
        </div>
        <div class="stat-card">
          <p class="label">Reach-out leads</p>
          <p class="value">{{ formatCount(funnel?.totals?.abandonedWithContact || 0) }}</p>
          <p class="sub">{{ formatCount(funnel?.totals?.ghosts || 0) }} typed then deleted a contact</p>
        </div>
      </div>

      <div class="card wide">
        <h2>Orders over time</h2>
        <p class="note">Every order placed in the period — not only delivered ones. That was hiding the real pipeline.</p>
        <AdminLineChart
          v-if="report?.daily?.length"
          :labels="chartLabels"
          :series="orderSeries"
        />
        <h2 class="chart-follow">Revenue in KES</h2>
        <p class="note">Collected is what customers paid. Net subtracts courier cost and ad spend.</p>
        <AdminLineChart
          v-if="report?.daily?.length"
          :labels="chartLabels"
          :series="kesSeries"
        />
        <p v-if="!report?.daily?.length" class="empty">No orders in this period.</p>
        <p v-else-if="report?.fx?.note" class="note">{{ report.fx.note }}</p>
      </div>

      <div class="split">
        <div class="card">
          <h2>Cash by currency</h2>
          <p class="note">Local amounts stay on the card. The KES line is the converted total.</p>
          <div v-if="report?.revenueByCurrency?.length" class="currency-list">
            <article v-for="row in report.revenueByCurrency" :key="row.currency">
              <h3>{{ row.currency }}</h3>
              <dl>
                <div>
                  <dt>Booked</dt>
                  <dd>{{ formatMoney(row.booked, row.currency) }}</dd>
                  <dd class="kes">{{ formatMoney(row.bookedKes, 'KES') }}</dd>
                </div>
                <div>
                  <dt>Pending</dt>
                  <dd>{{ formatMoney(row.pending, row.currency) }}</dd>
                  <dd class="kes">{{ formatMoney(row.pendingKes, 'KES') }}</dd>
                </div>
                <div>
                  <dt>Collected</dt>
                  <dd>{{ formatMoney(row.collected, row.currency) }}</dd>
                  <dd class="kes">{{ formatMoney(row.collectedKes, 'KES') }}</dd>
                </div>
              </dl>
              <p>{{ formatCount(row.orders) }} orders · {{ formatCount(row.delivered) }} delivered</p>
            </article>
          </div>
          <p v-else class="empty">No order value in this period.</p>
        </div>

        <div class="card">
          <h2>Order pipeline</h2>
          <div class="pipeline">
            <div v-for="row in report?.status || []" :key="row.status" class="pipe">
              <div class="pipe-top">
                <span>{{ row.status }}</span>
                <strong>{{ formatCount(row.count) }}</strong>
              </div>
              <div class="track">
                <div class="fill" :class="row.status" :style="{ width: `${Math.round((row.count / statusMax) * 100)}%` }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="split">
        <div class="card">
          <h2>Checkout funnel</h2>
          <p class="note">Same people, not raw page hits. {{ formatPercent(conversion.formRate) }} start the form, {{ formatPercent(conversion.orderRate) }} order.</p>
          <AdminLineChart
            v-if="funnel?.funnel?.length"
            :labels="funnelLabels"
            :series="funnelSeries"
          />
          <p class="funnel-link">
            <NuxtLink :to="`/a/${adminPath}/analytics/funnel`">See who dropped and who to call →</NuxtLink>
          </p>
        </div>

        <div class="card">
          <h2>Products that move</h2>
          <table v-if="report?.topProducts?.length" class="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Orders</th>
                <th>Cancel</th>
                <th>Collected</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="product in report.topProducts" :key="`${product.productId}-${product.currency}`">
                <td>
                  <strong>{{ product.productName }}</strong>
                  <div class="muted">{{ formatCount(product.totalSold) }} units · {{ product.currency }}</div>
                </td>
                <td>{{ formatCount(product.orders) }}</td>
                <td>{{ product.orders ? formatPercent((product.cancelled / product.orders) * 100) : '—' }}</td>
                <td>
                  {{ formatMoney(product.collectedKes, 'KES') }}
                  <div v-if="product.currency !== 'KES'" class="muted">{{ formatMoney(product.collected, product.currency) }}</div>
                </td>
                <td>
                  {{ formatMoney((product.collectedKes || 0) - (product.deliveryKes || 0), 'KES') }}
                  <div class="muted">after delivery</div>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else class="empty">No product sales in this period.</p>
        </div>
      </div>

      <div class="split">
        <div class="card">
          <h2>Cities</h2>
          <table v-if="report?.revenueByCity?.length" class="data-table">
            <thead>
              <tr>
                <th>City</th>
                <th>Orders</th>
                <th>Collected</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="city in report.revenueByCity" :key="`${city.city}-${city.currency}`">
                <td>
                  <strong>{{ city.city }}</strong>
                  <div class="muted">{{ city.country }}</div>
                </td>
                <td>{{ formatCount(city.orders) }} <span class="muted">· {{ city.cancelled }} cancel</span></td>
                <td>
                  {{ formatMoney(city.collectedKes, 'KES') }}
                  <div v-if="city.currency !== 'KES'" class="muted">{{ formatMoney(city.collected, city.currency) }}</div>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else class="empty">No city data in this period.</p>
        </div>

        <div class="card">
          <h2>Countries</h2>
          <div v-if="report?.revenueByCountry?.length" class="country-cards">
            <div v-for="item in report.revenueByCountry" :key="`${item.country}-${item.currency}`" class="country-card">
              <div class="country-name">{{ getCountryFlag(item.country) }} {{ item.country }}</div>
              <div class="country-revenue-amount">{{ formatMoney(item.collectedKes, 'KES') }}</div>
              <div class="country-orders">
                {{ formatCount(item.orders) }} orders · {{ formatCount(item.pending) }} pending
                · {{ formatMoney(item.bookedKes, 'KES') }} booked
                <span v-if="item.currency !== 'KES'"> · {{ formatMoney(item.collected, item.currency) }} local</span>
              </div>
            </div>
          </div>
          <p v-else class="empty">No country orders in this period.</p>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.analytics-page {
  max-width: 1200px;
}

.lede,
.note,
.muted,
.sub {
  color: var(--muted);
  font-size: 13px;
}

.lede {
  margin: 6px 0 0;
  max-width: 52ch;
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
  color: var(--ink);
  margin: 0;
}

.stat-card .value.money {
  font-size: 20px;
  line-height: 1.25;
}

.sub {
  margin: 6px 0 0;
}

.sub a {
  color: var(--accent);
  text-decoration: none;
  font-weight: 600;
}

.card {
  margin-bottom: 24px;
}

.card h2,
.card h3 {
  font-size: 16px;
  margin: 0 0 8px;
}

.note {
  margin: 0 0 16px;
}

.wide,
.split {
  margin-bottom: 24px;
}

.split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.currency-list,
.pipeline,
.country-cards {
  display: grid;
  gap: 14px;
}

.currency-list article {
  padding: 14px;
  background: var(--chip);
  border-radius: 12px;
}

.currency-list dl {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 0 0 8px;
}

.currency-list dt {
  font-size: 12px;
  color: var(--muted);
}

.currency-list dd {
  margin: 0;
  font-weight: 700;
  color: var(--ink);
}

.currency-list dd.kes {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}

.chart-follow {
  margin: 28px 0 8px;
}

.pipe-top {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  text-transform: capitalize;
  margin-bottom: 6px;
}

.track {
  height: 10px;
  background: var(--chip);
  border-radius: 99px;
  overflow: hidden;
}

.fill {
  height: 100%;
  background: var(--accent);
}

.fill.pending { background: #d97706; }
.fill.confirmed, .fill.shipped { background: #1f4ed8; }
.fill.delivered { background: #0f6b4c; }
.fill.cancelled { background: #dc2626; }

.funnel-link {
  margin: 16px 0 0;
}

.funnel-link a {
  color: var(--accent);
  text-decoration: none;
  font-weight: 600;
}

.country-card {
  padding: 16px;
  background: var(--chip);
  border-radius: 12px;
}

.country-name {
  font-weight: 600;
  margin-bottom: 6px;
}

.country-revenue-amount {
  font-size: 20px;
  font-weight: 700;
  color: var(--ink);
}

.empty {
  color: var(--muted);
  text-align: center;
  padding: 32px;
}

@media (max-width: 900px) {
  .split {
    grid-template-columns: 1fr;
  }
}
</style>
