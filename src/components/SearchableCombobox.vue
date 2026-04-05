<template>
  <div class="sc-wrap" ref="wrapRef">
    <div
      class="sc-trigger"
      :class="{ open: isOpen }"
      @click="toggle"
    >
      <span v-if="selectedLabel" class="sc-selected">{{ selectedLabel }}</span>
      <span v-else class="sc-placeholder">{{ placeholder }}</span>
      <span class="sc-arrow">▼</span>
    </div>
    <Teleport to="body">
      <div
        v-if="isOpen"
        class="sc-dropdown"
        :style="dropdownStyle"
        ref="dropdownRef"
      >
        <div class="sc-search-wrap">
          <input
            ref="searchRef"
            v-model="query"
            class="sc-search"
            placeholder="Поиск…"
            @keydown.escape="close"
            @keydown.enter="selectHighlighted"
            @keydown.down.prevent="moveHighlight(1)"
            @keydown.up.prevent="moveHighlight(-1)"
          />
        </div>
        <div class="sc-list" ref="listRef">
          <template v-for="group in filteredGroups" :key="group.id">
            <div class="sc-group-label">{{ group.name }}</div>
            <div
              v-for="item in group.items"
              :key="item.id"
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
        <div v-if="modelValue" class="sc-clear-wrap">
          <button class="sc-clear" @click="select(null)">Очистить выбор</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

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
}>(), {
  placeholder: '— Выберите —',
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

function open() {
  isOpen.value = true
  query.value = ''
  highlightedId.value = props.modelValue
  positionDropdown()
  nextTick(() => {
    searchRef.value?.focus()
    scrollToHighlighted()
  })
}

function close() {
  isOpen.value = false
  query.value = ''
}

function select(id: string | null) {
  emit('update:modelValue', id)
  close()
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
  const next = Math.max(0, Math.min(items.length - 1, idx + dir))
  highlightedId.value = items[next].id
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
  padding: 5px 10px;
  font-size: 12px;
  font-family: inherit;
  color: var(--text);
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 0.2s;
  min-height: 30px;
}
.sc-trigger:hover,
.sc-trigger.open {
  border-color: var(--accent);
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
  font-size: 8px;
  color: var(--text-dim);
  margin-left: 6px;
  flex-shrink: 0;
}
</style>

<style>
/* Dropdown teleported to body — unscoped */
.sc-dropdown {
  background: var(--card-bg, #fff);
  border: 1px solid var(--border, rgba(0,0,0,0.08));
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  display: flex;
  flex-direction: column;
  max-height: 280px;
  overflow: hidden;
}
.sc-search-wrap {
  padding: 6px 8px;
  border-bottom: 1px solid var(--border, rgba(0,0,0,0.08));
  flex-shrink: 0;
}
.sc-search {
  width: 100%;
  padding: 5px 8px;
  font-size: 12px;
  font-family: inherit;
  color: var(--text, #1a1a2e);
  background: var(--bg, #fafafa);
  border: 1px solid var(--border, rgba(0,0,0,0.08));
  border-radius: 4px;
  outline: none;
}
.sc-search:focus {
  border-color: var(--accent, #c08a3e);
}
.sc-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}
.sc-list::-webkit-scrollbar { width: 4px; }
.sc-list::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 2px; }
.sc-group-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted, rgba(0,0,0,0.35));
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 6px 10px 3px;
}
.sc-item {
  font-size: 12px;
  color: var(--text, #1a1a2e);
  padding: 5px 10px 5px 18px;
  cursor: pointer;
  transition: background 0.1s;
}
.sc-item:hover,
.sc-item.highlighted {
  background: var(--card-hover, rgba(0,0,0,0.06));
}
.sc-item.selected {
  color: var(--accent, #c08a3e);
  font-weight: 600;
}
.sc-item.disabled {
  color: var(--text-dim, rgba(0,0,0,0.2));
  cursor: default;
  pointer-events: none;
}
.sc-empty {
  font-size: 11px;
  color: var(--text-dim, rgba(0,0,0,0.2));
  font-style: italic;
  padding: 10px;
  text-align: center;
}
.sc-clear-wrap {
  padding: 4px 8px 6px;
  border-top: 1px solid var(--border, rgba(0,0,0,0.08));
  flex-shrink: 0;
}
.sc-clear {
  width: 100%;
  padding: 4px;
  font-size: 11px;
  font-family: inherit;
  color: var(--text-muted, rgba(0,0,0,0.35));
  background: none;
  border: 1px dashed var(--border, rgba(0,0,0,0.08));
  border-radius: 4px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.sc-clear:hover {
  color: var(--accent, #c08a3e);
  border-color: var(--accent, #c08a3e);
}
</style>
