<script setup lang="ts">
const props = defineProps<{ orderId: string }>()
const { formatMoney, formatDate, formatOrderTime } = useFormat()
const adminPath = useState<string>('adminPath')

const { data: order, refresh } = await useFetch(`/api/orders/${props.orderId}`)

const updating = ref(false)
const newStatus = ref('')
const notes = ref('')

watch(order, (o) => {
  if (o) {
    newStatus.value = o.status
    notes.value = o.notes || ''
  }
}, { immediate: true })

const statuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']

async function updateOrder() {
  updating.value = true
  try {
    await $fetch(`/api/orders/${props.orderId}`, {
      method: 'PATCH',
      body: {
        status: newStatus.value,
        notes: notes.value || null,
      },
    })
    await refresh()
  } catch (err) {
    console.error('Failed to update order:', err)
  } finally {
    updating.value = false
  }
}
</script>

<template>
  <div v-if="order" class="order-detail">
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
          <dt>Total</dt>
          <dd class="total">{{ formatMoney(order.totalPrice, order.currency) }}</dd>
          <dt>Order Date</dt>
          <dd>{{ formatOrderTime(order.orderDate) }}</dd>
          <dt>Requested Delivery</dt>
          <dd>{{ order.deliveryDate }}</dd>
        </dl>
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
          </div>
          <div class="form-group">
            <label>Internal Notes</label>
            <textarea v-model="notes" rows="3" placeholder="Add notes about this order..."></textarea>
          </div>
          <div class="form-actions">
            <button class="btn primary" type="submit" :disabled="updating">
              {{ updating ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.order-detail {
  max-width: 1000px;
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

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
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
