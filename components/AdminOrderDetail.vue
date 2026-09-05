<script setup lang="ts">
const props = defineProps<{ orderId: string }>()
const { formatMoney, formatDate, formatOrderTime } = useFormat()
const adminPath = useState<string>('adminPath')

const { data: order, error: orderError, refresh } = await useFetch(`/api/orders/${props.orderId}`)
const { getErrorMessage } = useApiError()

const updating = ref(false)
const updateError = ref('')
const newStatus = ref('')
const notes = ref('')
const deliveryCostInput = ref('')

watch(order, (o) => {
  if (o) {
    newStatus.value = o.status
    notes.value = o.notes || ''
    deliveryCostInput.value = o.deliveryCost == null ? '' : String(o.deliveryCost)
  }
}, { immediate: true })

const deviceLabel = computed(() => order.value ? keverdDeviceLabel(order.value) : null)
const risky = computed(() => order.value ? isKeverdRisky(order.value.keverdAction, order.value.keverdRiskScore) : false)
const relatedOrders = computed(() => order.value?.relatedOrders || [])
const timesSeen = computed(() => {
  if (!order.value) return null
  if (order.value.keverdTimesSeen != null) return order.value.keverdTimesSeen
  if (order.value.keverdVisitorId) return relatedOrders.value.length + 1
  return null
})

const statuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']

async function updateOrder() {
  updating.value = true
  updateError.value = ''
  try {
    await $fetch(`/api/orders/${props.orderId}`, {
      method: 'PATCH',
      body: {
        status: newStatus.value,
        notes: notes.value || null,
        deliveryCost: deliveryCostInput.value === '' ? null : Number(deliveryCostInput.value),
      },
    })
    await refresh()
  } catch (err) {
    updateError.value = getErrorMessage(err, 'Failed to update order')
  } finally {
    updating.value = false
  }
}
</script>

<template>
  <ErrorState
    v-if="orderError"
    title="Could not load this order"
    :message="getErrorMessage(orderError)"
    :retry="refresh"
  >
    <NuxtLink :to="`/a/${adminPath}/orders`">Back to orders</NuxtLink>
  </ErrorState>

  <div v-else-if="order" class="order-detail">
    <div class="admin-header">
      <div>
        <NuxtLink :to="`/a/${adminPath}/orders`" class="back-link">&larr; All Orders</NuxtLink>
        <h1>Order {{ order.orderId }}</h1>
      </div>
      <span :class="['status-badge', 'large', order.status]">{{ order.status }}</span>
    </div>

    <div class="grid">
      <div class="card">
        <h2>Customer Details</h2>
        <dl class="details">
          <dt>Name</dt>
          <dd>{{ order.customerName }}</dd>
          <dt>Primary Phone</dt>
          <dd>
            <a :href="`tel:${order.primaryPhone}`">{{ order.primaryPhone }}</a>
          </dd>
          <dt v-if="order.alternativePhone">Alternative Phone</dt>
          <dd v-if="order.alternativePhone">
            <a :href="`tel:${order.alternativePhone}`">{{ order.alternativePhone }}</a>
          </dd>
          <dt>City</dt>
          <dd>{{ order.city }}</dd>
          <dt>Delivery Address</dt>
          <dd>{{ order.deliveryAddress }}</dd>
        </dl>
      </div>

      <div class="card">
        <h2>Order Details</h2>
        <dl class="details">
          <dt>Product</dt>
          <dd>{{ order.productName }}</dd>
          <dt>Package</dt>
          <dd>{{ order.package }}</dd>
          <dt>Quantity</dt>
          <dd>{{ order.quantity }}</dd>
          <dt>Customer total</dt>
          <dd class="total">{{ formatMoney(order.totalPrice, order.currency) }}</dd>
          <dt>Delivery cost</dt>
          <dd>{{ formatMoney(order.effectiveDeliveryCost || 0, order.currency) }}</dd>
          <dt>After delivery</dt>
          <dd>{{ formatMoney(order.totalPrice - (order.effectiveDeliveryCost || 0), order.currency) }}</dd>
          <dt>Order Date</dt>
          <dd>{{ formatOrderTime(order.orderDate) }}</dd>
          <dt>Requested Delivery</dt>
          <dd>{{ order.deliveryDate }}</dd>
        </dl>
      </div>

      <div class="card full-width">
        <h2>Device</h2>
        <div v-if="order.keverdError" class="keverd-error">
          <span class="status-badge error">error</span>
          <dl class="details">
            <dt>Where</dt>
            <dd>{{ keverdErrorWhere(order.keverdErrorStage) }}</dd>
            <dt>Why</dt>
            <dd>{{ order.keverdError }}</dd>
          </dl>
        </div>
        <dl v-if="order.keverdEventId || order.keverdVisitorId || order.keverdAction" class="details">
          <dt>Buyer</dt>
          <dd>
            <span v-if="deviceLabel" :class="['status-badge', deviceLabel]">{{ deviceLabel }}</span>
            <span v-else class="muted">Unknown</span>
            <span v-if="risky" class="status-badge risky">risky</span>
            <span v-else-if="order.keverdAction || order.keverdRiskScore != null" class="status-badge clear">clear</span>
          </dd>
          <dt>Risk score</dt>
          <dd>{{ order.keverdRiskScore ?? '—' }}</dd>
          <dt>Times seen</dt>
          <dd>{{ timesSeen ?? '—' }}</dd>
          <dt>Visitor ID</dt>
          <dd class="mono">{{ order.keverdVisitorId || '—' }}</dd>
        </dl>
        <p v-else-if="!order.keverdError" class="muted">No device fingerprint was recorded for this order.</p>

        <div v-if="relatedOrders.length" class="related">
          <h3>Other orders from this device</h3>
          <ul>
            <li v-for="related in relatedOrders" :key="related.orderId">
              <NuxtLink :to="`/a/${adminPath}/orders/${related.orderId}`">{{ related.orderId }}</NuxtLink>
              <span>{{ related.customerName }} · {{ related.productName }} · {{ formatMoney(related.totalPrice, related.currency) }}</span>
              <span :class="['status-badge', related.status]">{{ related.status }}</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="card full-width">
        <h2>Update Order</h2>
        <form @submit.prevent="updateOrder">
          <div class="form-row">
            <div class="form-group">
              <label>Status</label>
              <select v-model="newStatus">
                <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Delivery cost ({{ order.currency }})</label>
              <input
                v-model="deliveryCostInput"
                type="number"
                min="0"
                step="1"
                :placeholder="order.defaultDeliveryCost != null ? String(order.defaultDeliveryCost) : 'Country default'"
              >
              <p class="field-hint">What the courier charges you. Leave blank to use the country rate from Costs.</p>
            </div>
          </div>
          <div class="form-group">
            <label>Internal Notes</label>
            <textarea v-model="notes" rows="3" placeholder="Add notes about this order..."></textarea>
          </div>
          <p v-if="updateError" class="error-banner">{{ updateError }}</p>
          <div class="form-actions">
            <button class="btn primary" type="submit" :disabled="updating">
              {{ updating ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <p v-else class="empty">Loading order…</p>
</template>

<style scoped>
.order-detail {
  max-width: 1000px;
}

.empty {
  color: var(--muted);
  padding: 32px;
}

.back-link {
  font-size: 14px;
  color: var(--muted);
  text-decoration: none;
  display: block;
  margin-bottom: 8px;
}

.back-link:hover {
  color: var(--ink);
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.status-badge.large {
  font-size: 14px;
  padding: 8px 16px;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.full-width {
  grid-column: 1 / -1;
}

.card h2 {
  font-size: 16px;
  margin: 0 0 16px;
}

.details {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 16px;
}

.details dt {
  font-size: 13px;
  color: var(--muted);
}

.details dd {
  margin: 0;
  font-weight: 500;
}

.details .total {
  font-size: 20px;
  font-weight: 700;
  color: var(--ink);
}

.details .mono,
.muted {
  font-size: 13px;
  color: var(--muted);
  word-break: break-all;
}

.details .mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 400;
}

.details dd .status-badge + .status-badge {
  margin-left: 8px;
}

.keverd-error {
  margin-bottom: 16px;
  padding: 12px 14px;
  border: 1px solid #fecaca;
  background: #fef2f2;
  border-radius: 10px;
}

.keverd-error .details {
  margin-top: 10px;
}

.related {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}

.related h3 {
  font-size: 14px;
  margin: 0 0 12px;
}

.related ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.related li {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
  font-size: 14px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.field-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--muted);
  font-weight: 400;
}

a {
  color: var(--accent);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
