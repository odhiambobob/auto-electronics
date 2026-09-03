<script setup lang="ts">
interface Option {
  value: string
  label: string
}

const props = defineProps<{
  modelValue: string
  options: Option[]
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const search = ref('')
const searchInput = ref<HTMLInputElement | null>(null)

const selectedLabel = computed(() => {
  const option = props.options.find(o => o.value === props.modelValue)
  return option?.label || props.placeholder || 'Select...'
})

const searchable = computed(() => props.options.length > 8)

const filteredOptions = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return props.options
  return props.options.filter(o => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q))
})

function toggle() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    search.value = ''
    nextTick(() => searchInput.value?.focus())
  }
}

function select(value: string) {
  emit('update:modelValue', value)
  isOpen.value = false
  search.value = ''
}

// Close on click outside
function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="dropdownRef" class="custom-select" :class="{ open: isOpen }">
    <button type="button" class="select-trigger" @click="toggle">
      <span class="select-value">{{ selectedLabel }}</span>
      <span class="select-arrow">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
    </button>
    
    <Transition name="dropdown">
      <div v-if="isOpen" class="select-dropdown">
        <div v-if="searchable" class="select-search">
          <input
            ref="searchInput"
            v-model="search"
            type="search"
            placeholder="Search…"
            @click.stop
          />
        </div>
        <button
          v-for="option in filteredOptions"
          :key="option.value"
          type="button"
          class="select-option"
          :class="{ selected: option.value === modelValue }"
          @click="select(option.value)"
        >
          {{ option.label }}
        </button>
        <p v-if="!filteredOptions.length" class="select-empty">No matches</p>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.custom-select {
  position: relative;
  display: inline-block;
  min-width: 140px;
}

.select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.select-trigger:hover {
  border-color: var(--muted);
}

.custom-select.open .select-trigger {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
}

.select-value {
  flex: 1;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.select-arrow {
  display: flex;
  color: var(--muted);
  transition: transform 0.2s;
}

.custom-select.open .select-arrow {
  transform: rotate(180deg);
}

.select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  min-width: 220px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 100;
  max-height: 320px;
  overflow-y: auto;
}

.select-search {
  position: sticky;
  top: 0;
  padding: 8px;
  background: var(--bg);
  border-bottom: 1px solid var(--line);
  z-index: 1;
}

.select-search input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 6px;
  font-size: 13px;
}

.select-empty {
  margin: 0;
  padding: 12px;
  font-size: 13px;
  color: var(--muted);
}

.select-option {
  display: block;
  width: 100%;
  padding: 10px 12px;
  text-align: left;
  background: none;
  border: none;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.1s;
}

.select-option:hover {
  background: var(--chip);
}

.select-option.selected {
  background: var(--chip);
  font-weight: 600;
  color: var(--accent);
}

.select-option:first-child {
  border-radius: 7px 7px 0 0;
}

.select-option:last-child {
  border-radius: 0 0 7px 7px;
}

.select-option:only-child {
  border-radius: 7px;
}

/* Transition */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
