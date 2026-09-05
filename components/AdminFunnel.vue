<script setup lang="ts">
const adminPath = useState<string>('adminPath')
const { formatRelativeTime, formatOrderTime } = useFormat()
const { getErrorMessage } = useApiError()

const days = ref(7)
const tab = ref<'reach' | 'ghosts' | 'people'>('reach')
const query = ref('')
const openId = ref<string | null>(null)
const detail = ref<JourneyDetail | null>(null)
const detailError = ref('')
const detailLoading = ref(false)

const { data: funnel, error: funnelError, refresh } = await useFetch('/api/analytics/funnel', {
  query: { days },
  watch: [days],
})

type JourneyRow = NonNullable<typeof funnel.value>['journeys'][number]
type JourneyDetail = {
  snapshot: {
    visitorId: string
    lastPath: string | null
    lastProductId: string | null
    lastEventType: string | null
    lastField: string | null
    customerName: string | null
    primaryPhone: string | null
    alternativePhone: string | null
    deliveryAddress: string | null
    city: string | null
    deliveryDate: string | null
    touchedFields: string[]
    clearedFields: { field: string; lastValue: string; at: string }[]
    converted: boolean
    keverdCountry: string | null
    keverdAction: string | null
    keverdRiskScore: number | null
    keverdTimesSeen: number | null
    keverdIsNew: boolean | null
    keverdProfile: {
      country?: string | null
      countryCode?: string | null
      timesSeen?: number | null
      isNew?: boolean | null
      firstSeen?: string | null
      lastSeen?: string | null
      uniqueIps?: number | null
      uniqueCountries?: number | null
      action?: string | null
      riskScore?: number | null
      incognito?: boolean | null
      vpn?: boolean | null
      proxy?: boolean | null
      bot?: boolean | null
      reasons?: string[]
    } | null
  } | null
  siblings: { visitorId: string; lastPath: string | null; lastSeenAt: string }[]
  productName: string | null
  events: {
    id: number
    eventType: string
    path: string | null
    productId: string | null
    createdAt: string
    metadata: Record<string, unknown> | null
  }[]
}

const eventLabels: Record<string, string> = {
  page_view: 'Browsing',
  product_view: 'Product page',
  checkout_open: 'Opened checkout',
  form_started: 'Started the form',
  field_filled: 'Filling the form',
  order_submitted: 'Placed an order',
}

const fieldLabels: Record<string, string> = {
  customerName: 'Name',
  primaryPhone: 'Phone',
  alternativePhone: 'Second phone',
  deliveryAddress: 'Address',
  city: 'City',
  deliveryDate: 'Delivery date',
}

const trendSeries = computed(() => [
  { id: 'visitors', label: 'Visitors', color: '#1f4ed8', values: funnel.value?.trend?.visitors || [] },
  { id: 'checkouts', label: 'Started form', color: '#0f6b4c', values: funnel.value?.trend?.checkouts || [] },
  { id: 'orders', label: 'Orders', color: '#dc2626', values: funnel.value?.trend?.orders || [] },
])

const totals = computed(() => funnel.value?.totals || {
  people: 0,
  converted: 0,
  abandonedWithContact: 0,
  ghosts: 0,
  repeatDevices: 0,
})

function matchesQuery(row: JourneyRow) {
  const needle = query.value.trim().toLowerCase()
  if (!needle) return true
  return [
    row.identity.name,
    row.identity.phone,
    row.identity.alternativePhone,
    row.identity.city,
    row.lastProductName,
    row.lastPath,
    row.keverd?.country,
    ...row.clearedFields.map((item) => item.lastValue),
  ].some((value) => value?.toLowerCase().includes(needle))
}

const reachOuts = computed(() => (funnel.value?.reachOuts || []).filter(matchesQuery))
const ghosts = computed(() => (funnel.value?.ghosts || []).filter((ghost) => {
  const needle = query.value.trim().toLowerCase()
  if (!needle) return true
  return [ghost.lastValue, ghost.field, ghost.productName, ghost.lastPath]
    .some((value) => value?.toLowerCase().includes(needle))
}))
const people = computed(() => (funnel.value?.journeys || []).filter(matchesQuery))

function bestPhone(row: JourneyRow) {
  return row.identity.phone
    || row.clearedFields.find((item) => /phone/i.test(item.field))?.lastValue
    || row.identity.alternativePhone
    || null
}

function bestName(row: JourneyRow) {
  return row.identity.name
    || row.clearedFields.find((item) => /name/i.test(item.field))?.lastValue
    || null
}

function toDialable(phone: string, country?: string | null) {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('254') || digits.startsWith('260')) return digits
  if (digits.startsWith('0')) {
    const code = /zambia/i.test(country || '') ? '260' : '254'
    return `${code}${digits.slice(1)}`
  }
  return digits
}

function callUrl(phone: string) {
  return `tel:${phone}`
}

function customerWhatsapp(row: JourneyRow) {
  const phone = bestPhone(row)
  if (!phone) return ''
  const number = toDialable(phone, row.keverd?.country)
  const name = bestName(row)
  const product = row.lastProductName || 'one of our products'
  const greeting = name ? `Hi ${name}` : 'Hi'
  const message = `${greeting}, you were looking at ${product} on Auto Electronics. Still want it delivered?`
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

function leftCopy(row: JourneyRow) {
  if (row.converted) return 'Bought'
  if (row.leftOnField) return `Left on ${fieldLabels[row.leftOnField] || row.leftOnField}`
  return eventLabels[row.lastStage || ''] || 'Left the store'
}

function fieldHeatWidth(count: number) {
  const peak = Math.max(1, ...(funnel.value?.fieldHeat || []).map((item) => item.filled))
  return `${Math.round((count / peak) * 100)}%`
}

async function toggleJourney(personId: string) {
  if (openId.value === personId) {
    openId.value = null
    detail.value = null
    detailError.value = ''
    return
  }

  openId.value = personId
  detail.value = null
  detailError.value = ''
  detailLoading.value = true
  try {
    detail.value = await $fetch(`/api/analytics/journeys/${personId}`)
  } catch (error) {
    detailError.value = getErrorMessage(error, 'Could not load this visitor')
  } finally {
    detailLoading.value = false
  }
}

function eventLine(event: JourneyDetail['events'][number]) {
  const meta = event.metadata || {}
  const field = typeof meta.field === 'string' ? fieldLabels[meta.field] || meta.field : null
  const value = typeof meta.value === 'string' ? meta.value : null
  const lastValue = typeof meta.lastValue === 'string' ? meta.lastValue : null
  if (event.eventType === 'field_filled' && meta.cleared && field) {
    return `Deleted ${field}${lastValue ? ` (kept “${lastValue}”)` : ''}`
  }
  if (event.eventType === 'field_filled' && field) {
    return value ? `Typed ${field}: ${value}` : `Filled ${field}`
  }
  if (event.eventType === 'page_view') return `Opened ${event.path || 'a page'}`
  if (event.eventType === 'product_view') return `Viewed ${event.productId || 'a product'}`
  return eventLabels[event.eventType] || event.eventType
}

function deviceFlags(row: JourneyRow) {
  const profile = row.keverd?.profile
  const flags: string[] = []
  if (row.keverd?.country) flags.push(row.keverd.country)
  if ((row.keverd?.timesSeen || 0) > 1 || row.sessions > 1) flags.push(`${row.keverd?.timesSeen || row.sessions}× device`)
  if (profile?.incognito) flags.push('Incognito')
  if (profile?.vpn) flags.push('VPN')
  if (profile?.proxy) flags.push('Proxy')
  if (profile?.bot) flags.push('Bot')
  if (profile?.uniqueIps && profile.uniqueIps > 1) flags.push(`${profile.uniqueIps} IPs`)
  if (row.keverd?.action) flags.push(row.keverd.action.replace('_', ' '))
  return flags
}
</script>

<template>
  <div class="funnel-page">
    <div class="admin-header">
      <div>
        <NuxtLink :to="`/a/${adminPath}/analytics`" class="back-link">&larr; Analytics</NuxtLink>
        <h1>Dropoff &amp; reach-out</h1>
      </div>
      <div class="period-selector">
        <button :class="{ active: days === 7 }" @click="days = 7">7 days</button>
        <button :class="{ active: days === 14 }" @click="days = 14">14 days</button>
        <button :class="{ active: days === 30 }" @click="days = 30">30 days</button>
      </div>
    </div>

    <p class="description">
      Same person across pages, the fields they typed — including numbers they deleted — and a board of people you can still call or WhatsApp.
    </p>

    <ErrorState
      v-if="funnelError"
      title="Could not load funnel data"
      :message="getErrorMessage(funnelError)"
      :retry="refresh"
    />

    <template v-else>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="label">People</div>
          <div class="value">{{ totals.people }}</div>
        </div>
        <div class="stat-card">
          <div class="label">Bought</div>
          <div class="value">{{ totals.converted }}</div>
        </div>
        <div class="stat-card hot">
          <div class="label">Can still reach</div>
          <div class="value">{{ totals.abandonedWithContact }}</div>
        </div>
        <div class="stat-card">
          <div class="label">Typed then deleted</div>
          <div class="value">{{ totals.ghosts }}</div>
        </div>
        <div class="stat-card">
          <div class="label">Repeat devices</div>
          <div class="value">{{ totals.repeatDevices }}</div>
        </div>
      </div>

      <div class="card">
        <h2>Daily conversion</h2>
        <p class="card-note">Visitors, people who started the form, and orders over this period.</p>
        <AdminLineChart
          v-if="funnel?.trend?.labels?.length"
          :labels="funnel.trend.labels"
          :series="trendSeries"
        />
        <p v-else class="empty">No daily data for this period yet.</p>
      </div>

      <div class="card">
        <h2>Where they leave</h2>
        <div v-if="funnel?.funnel?.length" class="funnel-chart">
          <div
            v-for="(stage, index) in funnel.funnel"
            :key="stage.eventType"
            class="funnel-stage"
          >
            <div class="stage-bar">
              <div class="stage-fill" :style="{ width: `${stage.conversionRate}%` }"></div>
              <span class="stage-label">{{ eventLabels[stage.eventType] }}</span>
            </div>
            <div class="stage-stats">
              <span class="count">{{ stage.count }} people</span>
              <span v-if="index > 0" class="dropoff" :class="{ high: stage.dropoffRate > 50 }">
                {{ stage.dropoffRate }}% dropoff
              </span>
              <span class="conversion">{{ stage.conversionRate }}% of visitors</span>
            </div>
          </div>
        </div>
        <p v-else class="empty">No funnel data for this period yet.</p>
      </div>

      <div class="card">
        <h2>Checkout form heat</h2>
        <p class="card-note">Which fields people actually typed, what they still have on file, and what they wiped.</p>
        <div v-if="funnel?.fieldHeat?.length" class="heat-list">
          <div v-for="item in funnel.fieldHeat" :key="item.field" class="heat-row">
            <div class="heat-name">{{ fieldLabels[item.field] || item.field }}</div>
            <div class="heat-bars">
              <div class="heat-track">
                <div class="heat-fill filled" :style="{ width: fieldHeatWidth(item.filled) }"></div>
              </div>
              <div class="heat-meta">
                <span>{{ item.filled }} typed</span>
                <span>{{ item.stillHave }} still on file</span>
                <span v-if="item.cleared" class="ghost-count">{{ item.cleared }} deleted</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="toolbar">
        <div class="tabs">
          <button :class="{ active: tab === 'reach' }" @click="tab = 'reach'">
            Call back ({{ totals.abandonedWithContact }})
          </button>
          <button :class="{ active: tab === 'ghosts' }" @click="tab = 'ghosts'">
            Deleted contacts ({{ totals.ghosts }})
          </button>
          <button :class="{ active: tab === 'people' }" @click="tab = 'people'">
            Everyone ({{ totals.people }})
          </button>
        </div>
        <input v-model="query" class="search" type="search" placeholder="Search name, phone, city, product…" />
      </div>

      <div v-if="tab === 'reach'" class="card">
        <h2>People who almost ordered</h2>
        <p class="card-note">
          A name or number they typed — even if they later deleted it — is enough to follow up.
          Hottest leads are at the top.
        </p>
        <div v-if="reachOuts.length" class="lead-list">
          <article v-for="row in reachOuts" :key="row.personId" class="lead">
            <div class="lead-top">
              <div>
                <h3>{{ bestName(row) || 'Unknown visitor' }}</h3>
                <p class="lead-sub">
                  {{ row.lastProductName || 'No product yet' }}
                  <span v-if="row.lastPath"> · last on {{ row.lastPath }}</span>
                  · {{ formatRelativeTime(row.lastSeenAt) }}
                </p>
              </div>
              <div class="lead-actions">
                <a v-if="bestPhone(row)" class="btn primary" :href="callUrl(bestPhone(row)!)">Call</a>
                <a v-if="customerWhatsapp(row)" class="btn ghost" :href="customerWhatsapp(row)" target="_blank" rel="noreferrer">WhatsApp</a>
                <button class="btn ghost" type="button" @click="toggleJourney(row.personId)">
                  {{ openId === row.personId ? 'Hide path' : 'See path' }}
                </button>
              </div>
            </div>

            <div class="lead-contact">
              <span v-if="bestPhone(row)" class="phone">{{ bestPhone(row) }}</span>
              <span v-if="row.identity.alternativePhone && row.identity.alternativePhone !== bestPhone(row)">
                alt {{ row.identity.alternativePhone }}
              </span>
              <span v-if="row.identity.city">{{ row.identity.city }}</span>
              <span v-if="row.identity.address">{{ row.identity.address }}</span>
              <strong>{{ leftCopy(row) }}</strong>
            </div>

            <div v-if="row.touchedFields.length" class="field-pills">
              <span
                v-for="field in row.touchedFields"
                :key="field"
                class="pill"
                :class="{ gone: row.clearedFields.some((item) => item.field === field) }"
              >
                {{ fieldLabels[field] || field }}
              </span>
            </div>

            <div v-if="row.clearedFields.length" class="ghost-line">
              Deleted
              <span v-for="item in row.clearedFields" :key="`${item.field}-${item.at}`">
                {{ fieldLabels[item.field] || item.field }} “{{ item.lastValue }}”
              </span>
            </div>

            <div v-if="deviceFlags(row).length" class="flags">
              <span v-for="flag in deviceFlags(row)" :key="flag" class="status-badge">{{ flag }}</span>
            </div>

            <div v-if="openId === row.personId" class="journey-panel">
              <p v-if="detailLoading" class="muted">Loading this person’s path…</p>
              <p v-else-if="detailError" class="error-banner">{{ detailError }}</p>
              <template v-else-if="detail">
                <p v-if="detail.siblings.length > 1" class="card-note">
                  Same Keverd device across {{ detail.siblings.length }} browsers / visits.
                </p>
                <dl v-if="detail.snapshot?.keverdProfile" class="device-grid">
                  <div v-if="detail.snapshot.keverdProfile.country">
                    <dt>Country</dt>
                    <dd>{{ detail.snapshot.keverdProfile.country }}</dd>
                  </div>
                  <div v-if="detail.snapshot.keverdTimesSeen != null">
                    <dt>Times seen</dt>
                    <dd>{{ detail.snapshot.keverdTimesSeen }}</dd>
                  </div>
                  <div v-if="detail.snapshot.keverdRiskScore != null">
                    <dt>Risk</dt>
                    <dd>{{ detail.snapshot.keverdRiskScore }} · {{ detail.snapshot.keverdAction || '—' }}</dd>
                  </div>
                  <div v-if="detail.snapshot.keverdProfile.uniqueIps != null">
                    <dt>Unique IPs</dt>
                    <dd>{{ detail.snapshot.keverdProfile.uniqueIps }}</dd>
                  </div>
                  <div v-if="detail.snapshot.keverdProfile.firstSeen">
                    <dt>First seen</dt>
                    <dd>{{ formatOrderTime(detail.snapshot.keverdProfile.firstSeen) }}</dd>
                  </div>
                </dl>
                <ol class="timeline">
                  <li v-for="event in detail.events" :key="event.id">
                    <span class="when">{{ formatOrderTime(event.createdAt) }}</span>
                    <span>{{ eventLine(event) }}</span>
                  </li>
                </ol>
              </template>
            </div>
          </article>
        </div>
        <p v-else class="empty">Nobody left a name or number in this period. As soon as someone types in checkout, they will show up here.</p>
      </div>

      <div v-else-if="tab === 'ghosts'" class="card">
        <h2>Typed, then wiped</h2>
        <p class="card-note">
          These values were entered and then deleted. We keep the last non-empty version so you can still reach them.
        </p>
        <table v-if="ghosts.length" class="data-table">
          <thead>
            <tr>
              <th>Kept value</th>
              <th>Field</th>
              <th>Product</th>
              <th>Last page</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ghost in ghosts" :key="`${ghost.personId}-${ghost.field}-${ghost.at}`">
              <td>
                <strong>{{ ghost.lastValue }}</strong>
                <div v-if="/phone/i.test(ghost.field)" class="inline-actions">
                  <a :href="callUrl(ghost.lastValue)">Call</a>
                  <a
                    :href="`https://wa.me/${toDialable(ghost.lastValue)}?text=${encodeURIComponent('Hi, you were looking at a product on Auto Electronics. Still want it delivered?')}`"
                    target="_blank"
                    rel="noreferrer"
                  >WhatsApp</a>
                </div>
              </td>
              <td>{{ fieldLabels[ghost.field] || ghost.field }}</td>
              <td>{{ ghost.productName || '—' }}</td>
              <td class="mono">{{ ghost.lastPath || '—' }}</td>
              <td>{{ formatRelativeTime(ghost.at) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty">No deleted contacts in this period.</p>
      </div>

      <div v-else class="card">
        <h2>Same person, every page</h2>
        <p class="card-note">
          Local browser id plus Keverd device id. If they clear cookies, the Keverd id still ties the visits together.
        </p>
        <table v-if="people.length" class="data-table people-table">
          <thead>
            <tr>
              <th>Person</th>
              <th>Left</th>
              <th>Last page</th>
              <th>Device</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="row in people" :key="row.personId">
              <tr>
                <td>
                  <strong>{{ bestName(row) || 'Anonymous' }}</strong>
                  <div class="muted">{{ bestPhone(row) || (row.sessions > 1 ? `${row.sessions} sessions` : 'No contact yet') }}</div>
                </td>
                <td>
                  <div>{{ leftCopy(row) }}</div>
                  <div class="muted">{{ formatRelativeTime(row.lastSeenAt) }}</div>
                </td>
                <td>
                  <div>{{ row.lastProductName || '—' }}</div>
                  <div class="mono muted">{{ row.lastPath || '—' }}</div>
                </td>
                <td>
                  <span v-if="row.converted" class="status-badge delivered">bought</span>
                  <span v-else-if="bestPhone(row)" class="status-badge pending">lead</span>
                  <span
                    v-for="flag in deviceFlags(row).slice(0, 3)"
                    :key="flag"
                    class="status-badge"
                  >{{ flag }}</span>
                </td>
                <td>
                  <button class="btn ghost" type="button" @click="toggleJourney(row.personId)">
                    {{ openId === row.personId ? 'Hide' : 'Path' }}
                  </button>
                </td>
              </tr>
              <tr v-if="openId === row.personId" class="detail-row">
                <td colspan="5">
                  <p v-if="detailLoading" class="muted">Loading this person’s path…</p>
                  <p v-else-if="detailError" class="error-banner">{{ detailError }}</p>
                  <ol v-else-if="detail" class="timeline">
                    <li v-for="event in detail.events" :key="event.id">
                      <span class="when">{{ formatOrderTime(event.createdAt) }}</span>
                      <span>{{ eventLine(event) }}</span>
                    </li>
                  </ol>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
        <p v-else class="empty">No visitor journeys in this period.</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.funnel-page {
  max-width: 1100px;
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

.period-selector,
.tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.period-selector button,
.tabs button {
  padding: 8px 16px;
  border: 1px solid var(--line);
  background: var(--bg);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.period-selector button.active,
.tabs button.active {
  background: var(--ink);
  color: var(--bg);
  border-color: var(--ink);
}

.stat-card.hot .value {
  color: var(--accent);
}

.card {
  margin-bottom: 24px;
}

.card h2,
.lead h3 {
  font-size: 16px;
  margin: 0 0 8px;
}

.card-note {
  color: var(--muted);
  font-size: 14px;
  margin: 0 0 16px;
}

.funnel-chart,
.heat-list,
.lead-list {
  display: grid;
  gap: 16px;
}

.funnel-stage,
.heat-row {
  display: grid;
  gap: 8px;
}

.heat-row {
  grid-template-columns: 140px 1fr;
  align-items: center;
}

.heat-name {
  font-weight: 600;
}

.heat-track,
.stage-bar {
  height: 12px;
  background: var(--chip);
  border-radius: 999px;
  overflow: hidden;
}

.stage-bar {
  height: 48px;
  border-radius: 8px;
  position: relative;
}

.stage-fill,
.heat-fill {
  height: 100%;
  background: color-mix(in srgb, var(--accent) 35%, transparent);
}

.stage-label {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-weight: 600;
}

.stage-stats,
.heat-meta,
.lead-contact,
.lead-sub,
.flags,
.field-pills,
.ghost-line,
.inline-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  font-size: 13px;
}

.dropoff.high,
.ghost-count {
  color: var(--danger);
  font-weight: 600;
}

.conversion {
  color: var(--good);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
}

.search {
  min-width: min(320px, 100%);
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--bg-2);
}

.lead {
  padding: 16px 0;
  border-top: 1px solid var(--line);
}

.lead:first-of-type {
  border-top: 0;
  padding-top: 0;
}

.lead-top {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.lead-actions,
.inline-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.phone {
  font-weight: 700;
  color: var(--ink);
}

.pill {
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--chip);
  font-size: 12px;
  font-weight: 600;
}

.pill.gone {
  text-decoration: line-through;
  color: var(--danger);
}

.ghost-line {
  color: var(--danger);
}

.flags .status-badge {
  text-transform: none;
}

.journey-panel,
.detail-row td {
  margin-top: 16px;
  padding: 16px;
  background: var(--chip);
  border-radius: 12px;
}

.device-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin: 0 0 16px;
}

.device-grid dt {
  font-size: 12px;
  color: var(--muted);
}

.device-grid dd {
  margin: 0;
  font-weight: 600;
  color: var(--ink);
}

.timeline {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 8px;
}

.timeline li {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 12px;
  font-size: 13px;
}

.when,
.mono,
.muted {
  color: var(--muted);
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}

.empty {
  color: var(--muted);
  text-align: center;
  padding: 32px;
}

.people-table .status-badge {
  margin: 0 4px 4px 0;
}

@media (max-width: 720px) {
  .heat-row,
  .lead-top,
  .timeline li {
    grid-template-columns: 1fr;
  }
}
</style>
