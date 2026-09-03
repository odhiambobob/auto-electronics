<script setup lang="ts">
const { formatMoney, formatDate } = useFormat()
const adminPath = useState<string>('adminPath')

const status = ref('')
const city = ref('')
const page = ref(1)

const queryParams = computed(() => {
  const params: Record<string, string | number> = { page: page.value, limit: 20 }
  if (status.value) params.status = status.value
  if (city.value) params.city = city.value
  return params
})

const { data, error: ordersError, refresh } = await useFetch('/api/orders', {
  query: queryParams,
  watch: [queryParams],
})
const { getErrorMessage } = useApiError()
const exportError = ref('')

const orders = computed(() => data.value?.orders || [])
const pagination = computed(() => data.value?.pagination || { page: 1, totalPages: 1, total: 0 })

const statuses = ['', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled']

function prevPage() {
  if (page.value > 1) page.value--
}

function nextPage() {
  if (page.value < pagination.value.totalPages) page.value++
}

async function exportCsv() {
  exportError.value = ''
  try {
    const allOrders = await $fetch('/api/orders', {
      query: { ...queryParams.value, limit: 10000 },
    })
    
    const headers = ['Order ID', 'Customer', 'Phone', 'City', 'Product', 'Package', 'Qty', 'Total', 'Status', 'Device', 'Risk', 'Order Date', 'Delivery Date']
    const rows = allOrders.orders.map((o: any) => [
      o.orderId,
      o.customerName,
      o.primaryPhone,
      o.city,
      o.productName,
      o.package,
      o.quantity,
      o.totalPrice,
      o.status,
      keverdDeviceLabel(o) || '',
      o.keverdError ? `${keverdErrorWhere(o.keverdErrorStage)}: ${o.keverdError}` : (isKeverdRisky(o.keverdAction, o.keverdRiskScore) ? 'risky' : (o.keverdAction || o.keverdRiskScore != null ? 'clear' : '')),
      new Date(o.orderDate).toISOString().split('T')[0],
      o.deliveryDate,
    ])
    
    const csv = [headers.join(','), ...rows.map((r: any[]) => r.map(v => `"${v}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    exportError.value = getErrorMessage(err, 'Failed to export orders')
  }
}
</script>

<template>
  <div class="orders-page">
    <div class="admin-header">
      <h1>Orders</h1>
      <button class="btn ghost" @click="exportCsv">Export CSV</button>
    </div>

    <p v-if="exportError" class="error-banner">{{ exportError }}</p>

    <ErrorState
      v-if="ordersError"
      title="Could not load orders"
      :message="getErrorMessage(ordersError)"
      :retry="refresh"
    />

    <template v-else>
    <div class="filters">
      <div class="filter-group">
        <label>Status</label>
        <select v-model="status">
          <option value="">All statuses</option>
          <option v-for="s in statuses.slice(1)" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
      <div class="filter-group">
        <label>City</label>
        <input v-model="city" type="text" placeholder="Filter by city" />
      </div>
    </div>

    <div class="card">
      <table v-if="orders.length" class="data-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Phone</th>
            <th>City</th>
            <th>Product</th>
            <th>Total</th>
            <th>Status</th>
            <th>Device</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in orders" :key="order.orderId">
            <td>
              <NuxtLink :to="`/a/${adminPath}/orders/${order.orderId}`">
                {{ order.orderId }}
              </NuxtLink>
            </td>
            <td>{{ order.customerName }}</td>
            <td>{{ order.primaryPhone }}</td>
            <td>{{ order.city }}</td>
            <td>{{ order.quantity }}× {{ order.package }} {{ order.productName }}</td>
            <td>{{ formatMoney(order.totalPrice, order.currency) }}</td>
            <td>
              <span :class="['status-badge', order.status]">{{ order.status }}</span>
            </td>
            <td class="device-cell">
              <span
                v-if="keverdDeviceLabel(order)"
                :class="['status-badge', keverdDeviceLabel(order)]"
              >
                {{ keverdDeviceLabel(order) }}
                <template v-if="(order.keverdOrderCount || 0) > 1"> · {{ order.keverdOrderCount }}</template>
              </span>
              <span
                v-if="isKeverdRisky(order.keverdAction, order.keverdRiskScore)"
                class="status-badge risky"
              >risky</span>
              <span
                v-if="order.keverdError"
                class="status-badge error"
                :title="`${keverdErrorWhere(order.keverdErrorStage)}: ${order.keverdError}`"
              >error</span>
              <span v-if="!keverdDeviceLabel(order) && !isKeverdRisky(order.keverdAction, order.keverdRiskScore) && !order.keverdError" class="muted">—</span>
            </td>
            <td>{{ formatDate(order.orderDate) }}</td>
          </tr>
        </tbody>
      </table>

      <p v-else class="empty">No orders found.</p>

      <div v-if="pagination.totalPages > 1" class="pagination">
        <button :disabled="page === 1" @click="prevPage">Previous</button>
        <span>Page {{ page }} of {{ pagination.totalPages }} ({{ pagination.total }} orders)</span>
        <button :disabled="page === pagination.totalPages" @click="nextPage">Next</button>
      </div>
    </div>
    </template>
  </div>
</template>

<style scoped>
.orders-page {
  max-width: 1400px;
}

.filters {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-group label {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}

.filter-group input,
.filter-group select {
  width: 200px;
}

.empty {
  color: var(--muted);
  text-align: center;
  padding: 32px;
}

.muted {
  color: var(--muted);
}

.device-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}

.pagination button {
  padding: 8px 16px;
  border: 1px solid var(--line);
  background: var(--bg);
  border-radius: 8px;
  cursor: pointer;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination span {
  font-size: 14px;
  color: var(--muted);
}

a {
  color: var(--accent);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
</style>
