<template>
  <div class="attractor-dropdowns">
    <div v-for="(_, idx) in selectedAttractors" :key="idx" class="dd-row">
      <SearchableCombobox
        :model-value="selectedAttractors[idx]"
        :groups="comboboxGroups(idx)"
        placeholder="— Выберите аттрактор —"
        @update:model-value="onComboSelect(idx, $event)"
      />
      <button
        class="corr-btn"
        :class="{ active: highlightedAttractorIdx === idx && selectedAttractors[idx] !== null }"
        :disabled="selectedAttractors[idx] === null"
        :title="highlightedAttractorIdx === idx ? 'Скрыть корреляции' : 'Показать корреляции на графе'"
        @click="onToggleCorrHighlight(idx)"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="2.5" cy="7" r="2" stroke="currentColor" stroke-width="1.4"/>
          <circle cx="11.5" cy="3" r="2" stroke="currentColor" stroke-width="1.4"/>
          <circle cx="11.5" cy="11" r="2" stroke="currentColor" stroke-width="1.4"/>
          <line x1="4.3" y1="6.1" x2="9.7" y2="3.9" stroke="currentColor" stroke-width="1.2"/>
          <line x1="4.3" y1="7.9" x2="9.7" y2="10.1" stroke="currentColor" stroke-width="1.2"/>
        </svg>
      </button>
    </div>
    <!-- Панель корреляций -->
    <div v-if="activeSelectedIds.size > 0" class="corr-panel">
      <button class="corr-toggle" @click="showCorr = !showCorr">
        <span class="corr-toggle-label">Корреляции</span>
        <span class="corr-toggle-icon">{{ showCorr ? '▲' : '▼' }}</span>
      </button>
      <div v-if="showCorr" class="corr-body">
        <!-- Между выбранными -->
        <template v-if="pairwiseCorr.length > 0">
          <div class="corr-section-label">Между выбранными</div>
          <div v-for="item in pairwiseCorr" :key="item.corrId" class="corr-row">
            <span class="corr-dot" :class="item.type === 'reinforcing' ? 'green' : 'red'"></span>
            <span class="corr-names">{{ item.fromLabel }} ↔ {{ item.toLabel }}</span>
            <span class="corr-pct" :class="item.type === 'reinforcing' ? 'green' : 'red'">
              {{ (item.strength * 100).toFixed(0) }}%
            </span>
          </div>
        </template>
        <template v-else-if="activeSelectedIds.size >= 2">
          <div class="corr-empty">Нет корреляций между выбранными</div>
        </template>

        <!-- Внешние корреляции -->
        <template v-if="externalCorr.length > 0">
          <div class="corr-section-label" style="margin-top:8px">Связи с другими</div>
          <div v-for="item in externalCorr" :key="item.corrId" class="corr-row">
            <span class="corr-dot" :class="item.type === 'reinforcing' ? 'green' : 'red'"></span>
            <span class="corr-names">{{ item.selectedLabel }} ↔ {{ item.otherLabel }}</span>
            <span class="corr-pct" :class="item.type === 'reinforcing' ? 'green' : 'red'">
              {{ (item.strength * 100).toFixed(0) }}%
            </span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAppState } from '@/composables/useAppState'
import { useAttractorStore } from '@/composables/useAttractorStore'
import SearchableCombobox from './SearchableCombobox.vue'
import type { ComboboxGroup } from './SearchableCombobox.vue'
import { CORRELATIONS } from '@/data/correlations'
import { getCorrelationAtAge } from '@/composables/useCorrelations'

const { selectedAttractors, activeSelectedIds, midAge, highlightedAttractorIdx } = useAppState()

function onToggleCorrHighlight(idx: number) {
  if (highlightedAttractorIdx.value === idx) {
    highlightedAttractorIdx.value = null
  } else {
    highlightedAttractorIdx.value = idx
  }
}
const { attractors, domains } = useAttractorStore()

const showCorr = ref(true)

interface L2Group {
  domainId: string
  domainName: string
  items: { id: string; label: string }[]
}

const groupedL2 = computed<L2Group[]>(() => {
  const map = new Map<string, { id: string; label: string }[]>()
  const domainOrder: string[] = []

  attractors.value
    .filter(a => a.level === 2)
    .forEach(a => {
      if (!map.has(a.domain)) {
        map.set(a.domain, [])
        domainOrder.push(a.domain)
      }
      map.get(a.domain)!.push({ id: a.id, label: a.label })
    })

  return domainOrder.map(domainId => ({
    domainId,
    domainName: domains.value[domainId]?.name ?? domainId,
    items: map.get(domainId)!,
  }))
})

function comboboxGroups(idx: number): ComboboxGroup[] {
  return groupedL2.value.map(g => ({
    id: g.domainId,
    name: g.domainName,
    items: g.items.map(item => ({
      id: item.id,
      label: item.label,
      disabled: isUsedElsewhere(item.id, idx),
    })),
  }))
}

function onComboSelect(idx: number, value: string | null) {
  const copy = [...selectedAttractors.value]
  copy[idx] = value

  if (copy[idx] === null && highlightedAttractorIdx.value === idx) {
    const nextFilled = copy.findIndex(v => v !== null)
    highlightedAttractorIdx.value = nextFilled >= 0 ? nextFilled : null
  }

  selectedAttractors.value = copy
}

function getLabel(id: string): string {
  return attractors.value.find(a => a.id === id)?.label ?? id
}

function isUsedElsewhere(id: string, currentIdx: number): boolean {
  return selectedAttractors.value.some((sel, i) => i !== currentIdx && sel === id)
}

function onSelect(idx: number, event: Event) {
  const value = (event.target as HTMLSelectElement).value
  const copy = [...selectedAttractors.value]
  copy[idx] = value === 'null' || value === '' ? null : value

  // Если очищен слот, на который указывает highlightedAttractorIdx — переключить
  if (copy[idx] === null && highlightedAttractorIdx.value === idx) {
    const nextFilled = copy.findIndex(v => v !== null)
    highlightedAttractorIdx.value = nextFilled >= 0 ? nextFilled : null
  }

  selectedAttractors.value = copy
}

// ── Корреляции ───────────────────────────────────────────────

interface CorrItem {
  corrId: string
  fromLabel: string
  toLabel: string
  selectedLabel: string
  otherLabel: string
  type: 'reinforcing' | 'conflicting'
  strength: number
}

const pairwiseCorr = computed<CorrItem[]>(() => {
  const ids = activeSelectedIds.value
  if (ids.size < 2) return []
  const result: CorrItem[] = []
  for (const corr of CORRELATIONS) {
    if (ids.has(corr.from) && ids.has(corr.to)) {
      const atAge = getCorrelationAtAge(corr, midAge.value)
      if (atAge && atAge.strength > 0) {
        result.push({
          corrId: corr.id,
          fromLabel: getLabel(corr.from),
          toLabel: getLabel(corr.to),
          selectedLabel: getLabel(corr.from),
          otherLabel: getLabel(corr.to),
          type: atAge.type as 'reinforcing' | 'conflicting',
          strength: atAge.strength,
        })
      }
    }
  }
  return result.sort((a, b) => b.strength - a.strength)
})

const externalCorr = computed<CorrItem[]>(() => {
  const ids = activeSelectedIds.value
  if (ids.size === 0) return []

  // Показываем внешние корреляции только от активного аттрактора (кнопка корреляций)
  const hIdx = highlightedAttractorIdx.value
  const sourceId = (hIdx !== null) ? selectedAttractors.value[hIdx] : null
  if (!sourceId) return [] // нет активной кнопки → нет внешних корреляций (согласовано с графом)

  const result: CorrItem[] = []
  const seen = new Set<string>()
  for (const corr of CORRELATIONS) {
    const fromIsSource = corr.from === sourceId
    const toIsSource = corr.to === sourceId
    if (!fromIsSource && !toIsSource) continue
    // Пропускаем pairwise (обе стороны в выбранных — показаны выше)
    if (ids.has(corr.from) && ids.has(corr.to)) continue
    if (seen.has(corr.id)) continue
    seen.add(corr.id)
    const atAge = getCorrelationAtAge(corr, midAge.value)
    if (atAge && atAge.strength > 0) {
      const otherId = fromIsSource ? corr.to : corr.from
      result.push({
        corrId: corr.id,
        fromLabel: getLabel(corr.from),
        toLabel: getLabel(corr.to),
        selectedLabel: getLabel(sourceId),
        otherLabel: getLabel(otherId),
        type: atAge.type as 'reinforcing' | 'conflicting',
        strength: atAge.strength,
      })
    }
  }
  return result.sort((a, b) => b.strength - a.strength).slice(0, 10)
})
</script>

<style scoped>
.attractor-dropdowns {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.demo-label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 2px;
}
.dd-row {
  display: flex;
  gap: 6px;
}
.demo-select {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  padding: 5px 28px 5px 10px;
  font-size: 12px;
  font-family: inherit;
  color: var(--text);
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
}
.demo-select:hover {
  border-color: var(--accent);
}
.demo-select:focus {
  border-color: var(--accent);
  background-color: var(--card-hover);
}
.demo-select option {
  background: var(--bg);
  color: var(--text);
}
.demo-select option:disabled {
  color: var(--text-dim);
}
.corr-btn {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--card-bg);
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  padding: 0;
}
.corr-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}
.corr-btn:disabled {
  opacity: 0.3;
  cursor: default;
}
.corr-btn.active {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}
.dd-add-btn {
  align-self: flex-start;
  background: none;
  border: 1px dashed var(--border);
  border-radius: 4px;
  color: var(--text-muted);
  font-size: 11px;
  font-family: inherit;
  padding: 4px 10px;
  cursor: not-allowed;
  opacity: 0.6;
  margin-top: 2px;
}

/* Панель корреляций */
.corr-panel {
  margin-top: 4px;
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
}
.corr-toggle {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 10px;
  background: var(--card-bg);
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.corr-toggle:hover {
  background: var(--card-hover);
}
.corr-toggle-label {
  font-weight: 600;
}
.corr-toggle-icon {
  font-size: 9px;
  opacity: 0.7;
}
.corr-body {
  padding: 6px 10px 8px;
  background: var(--bg);
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.corr-section-label {
  font-size: 10px;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 2px;
}
.corr-row {
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 18px;
}
.corr-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.corr-dot.green {
  background: #0891b2;
}
.corr-dot.red {
  background: #dc2626;
}
.corr-names {
  flex: 1;
  font-size: 11px;
  color: var(--text);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.corr-pct {
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}
.corr-pct.green {
  color: #0891b2;
}
.corr-pct.red {
  color: #dc2626;
}
.corr-empty {
  font-size: 11px;
  color: var(--text-dim);
  font-style: italic;
}
</style>
