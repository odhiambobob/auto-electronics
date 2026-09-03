<script setup lang="ts">
const adminPath = useState<string>('adminPath')

const days = ref(7)

const { data: funnel, error: funnelError, refresh } = await useFetch('/api/analytics/funnel', {
  query: { days },
  watch: [days],
})
const { getErrorMessage } = useApiError()

const eventLabels: Record<string, string> = {
  page_view: 'Page Views',
  product_view: 'Product Views',
  checkout_open: 'Checkout Opened',
  form_started: 'Form Started',
  field_filled: 'Fields Filled',
  order_submitted: 'Orders Submitted',
}
</script>

<template>
  <div class="funnel-page">
    <div class="admin-header">
      <div>
        <NuxtLink :to="`/a/${adminPath}/analytics`" class="back-link">&larr; Analytics</NuxtLink>
        <h1>Conversion Funnel</h1>
      </div>
      <div class="period-selector">
        <button :class="{ active: days === 7 }" @click="days = 7">7 days</button>
        <button :class="{ active: days === 14 }" @click="days = 14">14 days</button>
        <button :class="{ active: days === 30 }" @click="days = 30">30 days</button>
      </div>
    </div>

    <p class="description">
      Track where visitors drop off in the purchase process. Each stage shows unique visitors and the dropoff rate from the previous stage.
    </p>

    <ErrorState
      v-if="funnelError"
      title="Could not load funnel data"
      :message="getErrorMessage(funnelError)"
      :retry="refresh"
    />

    <div v-else class="card">
      <div v-if="funnel?.funnel?.length" class="funnel-chart">
        <div 
          v-for="(stage, index) in funnel.funnel" 
          :key="stage.eventType" 
          class="funnel-stage"
        >
          <div class="stage-bar">
            <div 
              class="stage-fill" 
              :style="{ width: `${stage.conversionRate}%` }"
            ></div>
            <span class="stage-label">{{ eventLabels[stage.eventType] }}</span>
          </div>
          <div class="stage-stats">
            <span class="count">{{ stage.count }} visitors</span>
            <span v-if="index > 0" class="dropoff" :class="{ high: stage.dropoffRate > 50 }">
              {{ stage.dropoffRate }}% dropoff
            </span>
            <span class="conversion">{{ stage.conversionRate }}% of total</span>
          </div>
        </div>
      </div>
      <p v-else class="empty">No funnel data available for this period. Events will appear as visitors browse your store.</p>
    </div>

    <div class="card">
      <h2>Understanding the Funnel</h2>
      <dl class="legend">
        <dt>Page Views</dt>
        <dd>Any page on your store was loaded</dd>
        <dt>Product Views</dt>
        <dd>A specific product page was viewed</dd>
        <dt>Checkout Opened</dt>
        <dd>The order form was focused/clicked</dd>
        <dt>Form Started</dt>
        <dd>Customer started typing in the form</dd>
        <dt>Fields Filled</dt>
        <dd>Customer filled required fields</dd>
        <dt>Orders Submitted</dt>
        <dd>Order was successfully placed</dd>
      </dl>
    </div>

    <div class="card tips">
      <h2>Optimization Tips</h2>
      <ul>
        <li v-if="funnel?.funnel && funnel.funnel[1]?.dropoffRate > 70">
          <strong>High product view dropoff:</strong> Your homepage may not be engaging enough. Consider improving featured products or hero imagery.
        </li>
        <li v-if="funnel?.funnel && funnel.funnel[2]?.dropoffRate > 60">
          <strong>High checkout dropoff:</strong> Visitors aren't reaching the order form. Make the "Place Order" section more visible on product pages.
        </li>
        <li v-if="funnel?.funnel && funnel.funnel[3]?.dropoffRate > 50">
          <strong>High form start dropoff:</strong> The form may be intimidating. Consider reducing required fields or adding reassurance text.
        </li>
        <li v-if="funnel?.funnel && funnel.funnel[5]?.dropoffRate > 30">
          <strong>High submission dropoff:</strong> Customers are abandoning after filling the form. Check for validation issues or unclear CTAs.
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.funnel-page {
  max-width: 900px;
}

.back-link {
  font-size: 14px;
  color: var(--muted);
  text-decoration: none;
  display: block;
  margin-bottom: 8px;
}

.description {
  color: var(--text);
  margin-bottom: 24px;
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

.card {
  margin-bottom: 24px;
}

.card h2 {
  font-size: 16px;
  margin: 0 0 16px;
}

.funnel-chart {
  display: grid;
  gap: 16px;
}

.funnel-stage {
  display: grid;
  gap: 8px;
}

.stage-bar {
  height: 48px;
  background: var(--chip);
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.stage-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: var(--accent);
  opacity: 0.2;
  transition: width 0.5s ease;
}

.stage-label {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-weight: 600;
  z-index: 1;
}

.stage-stats {
  display: flex;
  gap: 16px;
  font-size: 13px;
  padding-left: 16px;
}

.count {
  font-weight: 600;
}

.dropoff {
  color: var(--muted);
}

.dropoff.high {
  color: var(--danger);
  font-weight: 600;
}

.conversion {
  color: var(--good);
}

.empty {
  color: var(--muted);
  text-align: center;
  padding: 32px;
}

.legend {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 16px;
}

.legend dt {
  font-weight: 600;
}

.legend dd {
  margin: 0;
  color: var(--text);
}

.tips ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 12px;
}

.tips li {
  padding: 12px;
  background: var(--chip);
  border-radius: 8px;
  font-size: 14px;
}

.tips strong {
  display: block;
  margin-bottom: 4px;
  color: var(--ink);
}
</style>
