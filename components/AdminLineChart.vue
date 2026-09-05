<script setup lang="ts">
export type LineSeries = {
  id: string
  label: string
  color: string
  values: number[]
}

const props = withDefaults(defineProps<{
  labels: string[]
  series: LineSeries[]
  height?: number
}>(), {
  height: 260,
})

const hover = ref<number | null>(null)
const width = 720
const pad = { top: 18, right: 16, bottom: 36, left: 44 }
const innerW = width - pad.left - pad.right
const innerH = computed(() => props.height - pad.top - pad.bottom)

const maxValue = computed(() => {
  const peak = Math.max(0, ...props.series.flatMap((item) => item.values))
  if (peak <= 0) return 1
  const step = peak <= 10 ? 2 : peak <= 50 ? 10 : Math.ceil(peak / 4 / 10) * 10
  return Math.ceil(peak / step) * step
})

const ticks = computed(() => {
  const max = maxValue.value
  return [0, max / 2, max].map((value) => Math.round(value))
})

function x(index: number) {
  const last = Math.max(1, props.labels.length - 1)
  return pad.left + (index / last) * innerW
}

function y(value: number) {
  return pad.top + innerH.value - (value / maxValue.value) * innerH.value
}

function points(values: number[]) {
  return values.map((value, index) => `${x(index)},${y(value)}`).join(' ')
}

function area(values: number[]) {
  if (!values.length) return ''
  const line = values.map((value, index) => `${x(index)},${y(value)}`).join(' ')
  return `${x(0)},${y(0)} ${line} ${x(values.length - 1)},${y(0)}`
}

function labelFor(index: number) {
  const raw = props.labels[index] || ''
  const count = props.labels.length
  const step = count > 14 ? Math.ceil(count / 7) : 1
  if (index !== 0 && index !== count - 1 && index % step !== 0) return ''
  if (raw.length >= 10 && raw.includes('-')) {
    return raw.slice(5)
  }
  return raw
}

function nearest(event: MouseEvent) {
  const svg = event.currentTarget as SVGSVGElement
  const box = svg.getBoundingClientRect()
  const svgX = ((event.clientX - box.left) / box.width) * width
  let best = 0
  let distance = Infinity
  props.labels.forEach((_, index) => {
    const gap = Math.abs(x(index) - svgX)
    if (gap < distance) {
      distance = gap
      best = index
    }
  })
  hover.value = best
}
</script>

<template>
  <div class="line-chart">
    <svg
      :viewBox="`0 0 ${width} ${height}`"
      role="img"
      @mousemove="nearest"
      @mouseleave="hover = null"
    >
      <line
        v-for="tick in ticks"
        :key="tick"
        :x1="pad.left"
        :x2="width - pad.right"
        :y1="y(tick)"
        :y2="y(tick)"
        class="grid"
      />
      <text
        v-for="tick in ticks"
        :key="`t-${tick}`"
        :x="pad.left - 8"
        :y="y(tick) + 4"
        class="axis"
        text-anchor="end"
      >{{ tick }}</text>
      <text
        v-for="(label, index) in labels"
        :key="label"
        :x="x(index)"
        :y="height - 10"
        class="axis"
        text-anchor="middle"
      >{{ labelFor(index) }}</text>

      <polygon
        v-for="item in series"
        :key="`${item.id}-area`"
        :points="area(item.values)"
        :fill="item.color"
        class="area"
      />
      <polyline
        v-for="item in series"
        :key="item.id"
        :points="points(item.values)"
        :stroke="item.color"
        fill="none"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <circle
        v-for="item in series"
        v-show="hover != null"
        :key="`${item.id}-dot`"
        :cx="hover == null ? 0 : x(hover)"
        :cy="hover == null ? 0 : y(item.values[hover] || 0)"
        r="4"
        :fill="item.color"
      />
      <line
        v-if="hover != null"
        :x1="x(hover)"
        :x2="x(hover)"
        :y1="pad.top"
        :y2="height - pad.bottom"
        class="guide"
      />
    </svg>

    <div class="legend">
      <span v-for="item in series" :key="item.id" class="legend-item">
        <i :style="{ background: item.color }" />
        {{ item.label }}
      </span>
    </div>

    <div v-if="hover != null" class="tip">
      <strong>{{ labels[hover] }}</strong>
      <span v-for="item in series" :key="`${item.id}-tip`">
        {{ item.label }}: {{ item.values[hover] || 0 }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.line-chart {
  display: grid;
  gap: 10px;
}

svg {
  width: 100%;
  height: auto;
  display: block;
}

.grid {
  stroke: var(--line);
  stroke-dasharray: 4 6;
}

.guide {
  stroke: var(--muted);
  stroke-dasharray: 3 5;
}

.axis {
  fill: var(--muted);
  font-size: 11px;
}

.area {
  opacity: 0.08;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 16px;
  font-size: 13px;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend-item i {
  width: 10px;
  height: 10px;
  border-radius: 99px;
}

.tip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  font-size: 13px;
  color: var(--text);
}

.tip strong {
  color: var(--ink);
}
</style>
