<script setup lang="ts">
import type { Order } from '~/types/store'

const router = useRouter()
const config = useRuntimeConfig()
const { formatMoney, formatOrderTime } = useFormat()
const { whatsappUrl, orderWhatsappMessage } = useWhatsapp()
const { trackMetaPurchase } = useTracking()

const order = ref<(Order & { metaPixel?: string | null }) | null>(null)

onMounted(() => {
  const raw = sessionStorage.getItem('ae.lastOrder')
  if (!raw) {
    router.replace('/')
    return
  }
  try {
    order.value = JSON.parse(raw) as Order & { metaPixel?: string | null }

    const purchaseKey = `ae.fbPurchase.${order.value.orderId}`
    if (!sessionStorage.getItem(purchaseKey)) {
      sessionStorage.setItem(purchaseKey, '1')
      trackMetaPurchase(order.value.metaPixel)
    }
  } catch {
    router.replace('/')
  }
})

useSeoMeta({
  title: `Order placed · ${config.public.siteName}`,
  description: 'Your order is in. We will confirm on WhatsApp.',
  robots: 'noindex, nofollow',
})

const message = computed(() =>
  order.value
    ? orderWhatsappMessage({
        package: order.value.package,
        quantity: order.value.quantity,
        productName: order.value.productName,
        orderDate: order.value.orderDate,
      })
    : '',
)
</script>

<template>
  <div v-if="order" class="page">
    <p class="eyebrow">Order {{ order.orderId }}</p>
    <h1>It is in. We will bring it.</h1>
    <p class="lede">
      {{ order.package }} {{ order.productName }} is booked for {{ order.city }}.
      Pay when it arrives — nothing was taken on this site.
    </p>

    <dl>
      <div>
        <dt>When</dt>
        <dd>{{ formatOrderTime(order.orderDate) }}</dd>
      </div>
      <div>
        <dt>Delivery window</dt>
        <dd>{{ order.deliveryDate }}</dd>
      </div>
      <div>
        <dt>Total</dt>
        <dd>{{ formatMoney(order.totalPrice, order.currency) }}</dd>
      </div>
      <div>
        <dt>Status</dt>
        <dd>{{ order.status }}</dd>
      </div>
    </dl>

    <a class="btn whatsapp" :href="whatsappUrl(message)" target="_blank" rel="noopener">
      Message us on WhatsApp
    </a>
    <p class="hint">Opens WhatsApp with your order already written so you do not retype it.</p>
    <NuxtLink class="home-link" to="/">Back to home</NuxtLink>
  </div>
</template>

<style scoped>
.page {
  width: min(720px, calc(100% - 32px));
  margin: 0 auto;
  padding: 72px 0 48px;
}

.eyebrow {
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 12px;
  font-weight: 600;
  color: var(--good);
}

h1 {
  font-family: var(--display);
  font-size: clamp(36px, 6vw, 60px);
  letter-spacing: -0.06em;
  line-height: 0.95;
  margin: 10px 0 16px;
}

.lede {
  font-size: 18px;
  color: var(--text);
  max-width: 40ch;
}

dl {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin: 36px 0;
  padding: 24px;
  border-radius: 20px;
  background: var(--bg-2);
  border: 1px solid var(--line);
}

dt {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

dd {
  margin: 4px 0 0;
  font-weight: 600;
  font-size: 16px;
}

.whatsapp {
  background: #128c7e;
  color: #fff;
}

.whatsapp:hover {
  filter: brightness(1.05);
}

.hint {
  color: var(--muted);
  font-size: 14px;
  margin: 12px 0 28px;
}

.home-link {
  color: var(--ink);
  font-weight: 600;
}

@media (max-width: 640px) {
  dl {
    grid-template-columns: 1fr;
  }
}
</style>
