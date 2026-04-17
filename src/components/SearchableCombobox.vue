<template>
  <div class="sc-wrap" ref="wrapRef">
    <button
      type="button"
      class="sc-trigger"
      :class="{ open: isOpen }"
      :id="triggerId"
      role="combobox"
      :aria-expanded="isOpen"
      :aria-controls="listboxId"
      aria-haspopup="listbox"
      :aria-activedescendant="isOpen && highlightedId ? optionId(highlightedId) : undefined"
      :aria-label="ariaLabel"
      @click="toggle"
      @keydown.enter.prevent="onTriggerKey('open')"
      @keydown.space.prevent="onTriggerKey('open')"
      @keydown.down.prevent="onTriggerKey('open')"
      @keydown.up.prevent="onTriggerKey('open')"
    >
      <span v-if="selectedLabel" class="sc-selected">{{ selectedLabel }}</span>
      <span v-else class="sc-placeholder">{{ placeholder }}</span>
      <span class="sc-arrow" aria-hidden="true">▼</span>
    </button>
    <Teleport to="body">
      <div
        v-if="isOpen"
        class="sc-dropdown"
        :style="dropdownStyle"
        ref="dropdownRef"
        tabindex="-1"
        @keydown.escape.prevent="closeAndFocusTrigger"
        @keydown.enter.prevent="selectHighlighted"
        @keydown.down.prevent="moveHighlight(1)"
        @keydown.up.prevent="moveHighlight(-1)"
        @keydown.home.prevent="moveHighlightTo('first')"
        @keydown.end.prevent="moveHighlightTo('last')"
        @keydown.tab="closeAndFocusTrigger"
      >
        <div v-if="searchable" class="sc-search-wrap">
          <input
            ref="searchRef"
            v-model="query"
            class="sc-search"
            type="text"
            :aria-controls="listboxId"
            :aria-activedescendant="highlightedId ? optionId(highlightedId) : undefined"
            aria-autocomplete="list"
            placeholder="Поиск…"
          />
        </div>
        <div
          class="sc-list"
          ref="listRef"
          :id="listboxId"
          role="listbox"
          :aria-label="ariaLabel"
        >
          <template v-for="group in filteredGroups" :key="group.id">
            <div
              v-if="group.name"
              class="sc-group-label"
              role="presentation"
            >{{ group.name }}</div>
            <div
              v-for="item in group.items"
              :key="item.id"
              :id="optionId(item.id)"
              role="option"
              :aria-selected="modelValue === item.id"
              :aria-disabled="item.disabled || undefined"
              class="sc-item"
              :class="{
                disabled: item.disabled,
                highlighted: highlightedId === item.id,
                selected: modelValue === item.id,
              }"
              @click="!item.disabled && select(item.id)"
              @mouseenter="highlightedId = item.id"
            >
              {{ item.label }}
            </div>
          </template>
          <div v-if="flatFiltered.length === 0" class="sc-empty">Ничего не найдено</div>
        </div>
        <div v-if="clearable && modelValue" class="sc-clear-wrap">
          <button class="sc-clear" type="button" @click="select(null)">Очистить выбор</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount, useId } from 'vue'

export interface ComboboxItem {
  id: string
  label: string
  disabled?: boolean
}

export interface ComboboxGroup {
  id: string
  name: string
  items: ComboboxItem[]
}

const props = withDefaults(defineProps<{
  modelValue: string | null
  groups: ComboboxGroup[]
  placeholder?: string
  searchable?: boolean
  clearable?: boolean
  ariaLabel?: string
}>(), {
  placeholder: '— Выберите —',
  searchable: true,
  clearable: true,
  ariaLabel: 'Выбор значения',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const isOpen = ref(false)
const query = ref('')
const highlightedId = ref<string | null>(null)
const wrapRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const searchRef = ref<HTMLInputElement | null>(null)
const listRef = ref<HTMLElement | null>(null)
const dropdownStyle = ref<Record<string, string>>({})

const uid = useId()
const triggerId = `sc-trigger-${uid}`
const listboxId = `sc-listbox-${uid}`
function optionId(id: string) {
  return `sc-opt-${uid}-${id}`
}

const selectedLabel = computed(() => {
  for (const g of props.groups) {
    const item = g.items.find(i => i.id === props.modelValue)
    if (item) return item.label
  }
  return ''
})

const filteredGroups = computed(() => {
  const q = query.value.toLowerCase().trim()
  if (!q) return props.groups
  return props.groups
    .map(g => ({
      ...g,
      items: g.items.filter(i => i.label.toLowerCase().includes(q)),
    }))
    .filter(g => g.items.length > 0)
})

const flatFiltered = computed(() =>
  filteredGroups.value.flatMap(g => g.items.filter(i => !i.disabled))
)

function positionDropdown() {
  if (!wrapRef.value) return
  const rect = wrapRef.value.getBoundingClientRect()
  dropdownStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 2}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    zIndex: '9999',
  }
}

function toggle() {
  if (isOpen.value) {
    close()
  } else {
    open()
  }
}

function onTriggerKey(intent: 'open') {
  if (intent === 'open') open()
}

function open() {
  isOpen.value = true
  query.value = ''
  highlightedId.value = props.modelValue ?? flatFiltered.value[0]?.id ?? null
  positionDropdown()
  nextTick(() => {
    if (props.searchable) {
      searchRef.value?.focus()
    } else {
      dropdownRef.value?.focus()
    }
    scrollToHighlighted()
  })
}

function close() {
  isOpen.value = false
  query.value = ''
}

function closeAndFocusTrigger() {
  close()
  nextTick(() => {
    const triggerEl = wrapRef.value?.querySelector('.sc-trigger') as HTMLElement | null
    triggerEl?.focus()
  })
}

function select(id: string | null) {
  emit('update:modelValue', id)
  closeAndFocusTrigger()
}

function selectHighlighted() {
  if (highlightedId.value) {
    const item = flatFiltered.value.find(i => i.id === highlightedId.value)
    if (item && !item.disabled) {
      select(item.id)
    }
  }
}

function moveHighlight(dir: number) {
  const items = flatFiltered.value
  if (items.length === 0) return
  const idx = items.findIndex(i => i.id === highlightedId.value)
  const next = idx === -1
    ? (dir > 0 ? 0 : items.length - 1)
    : Math.max(0, Math.min(items.length - 1, idx + dir))
  highlightedId.value = items[next].id
  scrollToHighlighted()
}

function moveHighlightTo(target: 'first' | 'last') {
  const items = flatFiltered.value
  if (items.length === 0) return
  highlightedId.value = items[target === 'first' ? 0 : items.length - 1].id
  scrollToHighlighted()
}

function scrollToHighlighted() {
  nextTick(() => {
    if (!listRef.value || !highlightedId.value) return
    const el = listRef.value.querySelector('.sc-item.highlighted') as HTMLElement
    if (el) el.scrollIntoView({ block: 'nearest' })
  })
}

function onClickOutside(e: MouseEvent) {
  if (!isOpen.value) return
  const target = e.target as Node
  if (wrapRef.value?.contains(target)) return
  if (dropdownRef.value?.contains(target)) return
  close()
}

onMounted(() => {
  document.addEventListener('mousedown', onClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onClickOutside)
})

watch(() => query.value, () => {
  const items = flatFiltered.value
  if (items.length > 0 && !items.find(i => i.id === highlightedId.value)) {
    highlightedId.value = items[0].id
  }
})
</script>

<style scoped>
.sc-wrap {
  position: relative;
  width: 100%;
}
.sc-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 6px 10px;
  font-size: 12px;
  font-family: inherit;
  text-align: left;
  color: var(--text);
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 6px);
  cursor: pointer;
  transition: border-color var(--duration-fast, 0.15s) var(--ease-out-quad),
              box-shadow var(--duration-fast, 0.15s);
  min-height: 30px;
}
.sc-trigger:hover {
  border-color: var(--accent);
}
.sc-trigger.open,
.sc-trigger:focus-visible {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-subtle, rgba(192,138,62,0.18));
  outline: none;
}
.sc-selected {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.sc-placeholder {
  color: var(--text-muted);
  flex: 1;
}
.sc-arrow {
  font-size: 7px;
  color: var(--text-dim);
  margin-left: 6px;
  flex-shrink: 0;
  opacity: 0.7;
  transition: transform var(--duration-base, 0.25s) var(--ease-out-expo);
}
.sc-trigger.open .sc-arrow {
  transform: rotate(180deg);
}
</style>

<style>
/* Dropdown teleported to body — unscoped */
.sc-dropdown {
  background: var(--bg, #fafafa);
  border: 1px solid var(--border, rgba(0,0,0,0.07));
  border-radius: var(--radius-md, 10px);
  box-shadow: var(--shadow-lg, 0 2px 4px rgba(0,0,0,0.03), 0 8px 20px rgba(0,0,0,0.06), 0 20px 48px rgba(0,0,0,0.04));
  display: flex;
  flex-direction: column;
  max-height: 280px;
  overflow: hidden;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
.sc-search-wrap {
  padding: 8px 8px 6px;
  border-bottom: 1px solid var(--border2, rgba(0,0,0,0.04));
  flex-shrink: 0;
}
.sc-search {
  width: 100%;
  padding: 6px 10px;
  font-size: 12px;
  font-family: inherit;
  color: var(--text, #1a1a2e);
  background: var(--card-bg, rgba(0,0,0,0.025));
  border: 1px solid var(--border, rgba(0,0,0,0.07));
  border-radius: var(--radius-sm, 6px);
  outline: none;
  transition: border-color var(--duration-fast, 0.15s), box-shadow var(--duration-fast, 0.15s);
}
.sc-search:focus {
  border-color: var(--accent, #c08a3e);
  box-shadow: 0 0 0 2px var(--accent-subtle, rgba(192,138,62,0.08));
}
.sc-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}
.sc-list:focus {
  outline: none;
}
.sc-group-label {
  font-size: 9px;
  font-weight: 600;
  color: var(--text-dim, rgba(0,0,0,0.35));
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 8px 12px 3px;
}
.sc-item {
  font-size: 12px;
  color: var(--text, #1a1a2e);
  padding: 6px 12px 6px 20px;
  cursor: pointer;
  transition: background var(--duration-fast, 0.15s) var(--ease-out-quad);
}
.sc-item:hover,
.sc-item.highlighted {
  background: var(--card-hover, rgba(0,0,0,0.05));
}
.sc-item.selected {
  color: var(--accent, #c08a3e);
  font-weight: 600;
}
.sc-item.disabled {
  color: var(--text-dim, rgba(0,0,0,0.35));
  cursor: default;
  pointer-events: none;
}
.sc-empty {
  font-size: 11px;
  color: var(--text-dim, rgba(0,0,0,0.35));
  font-style: italic;
  padding: 12px;
  text-align: center;
}
.sc-clear-wrap {
  padding: 6px 8px;
  border-top: 1px solid var(--border2, rgba(0,0,0,0.04));
  flex-shrink: 0;
}
.sc-clear {
  width: 100%;
  padding: 5px;
  font-size: 11px;
  font-family: inherit;
  color: var(--text-dim, rgba(0,0,0,0.35));
  background: none;
  border: 1px dashed var(--border, rgba(0,0,0,0.07));
  border-radius: var(--radius-sm, 6px);
  cursor: pointer;
  transition: color var(--duration-fast, 0.15s) var(--ease-out-quad),
              border-color var(--duration-fast, 0.15s);
}
.sc-clear:hover {
  color: var(--accent, #c08a3e);
  border-color: var(--accent, #c08a3e);
}
</style>
