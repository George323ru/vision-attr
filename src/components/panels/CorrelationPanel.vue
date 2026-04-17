<template>
  <div class="correlation-panel">
    <div v-if="!focusedNodeId" class="cp-empty">
      <div class="cp-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="6" cy="6" r="3"/>
          <circle cx="18" cy="18" r="3"/>
          <path d="M8.5 8.5l7 7"/>
          <circle cx="18" cy="6" r="3"/>
          <path d="M8.5 6h7"/>
        </svg>
      </div>
      <p class="cp-hint">Кликните на аттрактор второго уровня на графе, чтобы увидеть его корреляции</p>
    </div>
    <div v-else class="cp-content">
      <div class="cp-node-header">
        <span class="cp-node-name">{{ focusedName }}</span>
        <div class="cp-header-right">
          <span class="cp-node-count">{{ correlationList.length }} связей</span>
          <button class="cp-reset-btn" @click="dispatch({ type: 'CLICK_EMPTY' })" title="Снять выделение" aria-label="Снять выделение">×</button>
        </div>
      </div>
      <div class="cp-age-section">
        <div class="cp-age-label">Возраст: <b>{{ ageMin }}–{{ ageMax }}</b></div>
        <DualRangeSlider
          :min="18"
          :max="75"
          :model-min="ageMin"
          :model-max="ageMax"
          :ticks="[18, 25, 35, 45, 55, 65, 75]"
          aria-label-min="Минимальный возраст"
          aria-label-max="Максимальный возраст"
          @update:model-min="(v: number) => dispatch({ type: 'SET_AGE_RANGE', min: v, max: ageMax })"
          @update:model-max="(v: number) => dispatch({ type: 'SET_AGE_RANGE', min: ageMin, max: v })"
        />
      </div>
      <div v-if="correlationList.length === 0" class="cp-no-corr">
        Нет корреляций для возраста {{ ageMin }}–{{ ageMax }}
      </div>
      <div v-else class="cp-list">
        <div v-for="item in correlationList" :key="item.id" class="cp-item">
          <span
            class="cp-dot"
            :class="item.type"
            :title="item.type === 'reinforcing' ? 'Усиление' : 'Конфликт'"
          ></span>
          <span class="cp-name">{{ item.otherName }}</span>
          <div class="cp-bar-wrap">
            <div class="cp-bar" :class="item.type" :style="{ width: barWidth(item.strength) }"></div>
          </div>
          <span class="cp-pct">{{ Math.round(item.strength * 100) }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from '@/composables/state/useStore'
import { useAttractorStore } from '@/composables/useAttractorStore'
import { getCorrEdgesForNode } from '@/composables/useCorrelations'
import { CORRELATIONS } from '@/data/correlations'
import DualRangeSlider from '@/components/DualRangeSlider.vue'
import { flatLabel } from '@/composables/useAttractorDisplay'

const { profile, focusedNodeId, correlationAge, dispatch } = useStore()
const { getAttractor } = useAttractorStore()

const ageMin = computed(() => profile.value.demographics.ageMin)
const ageMax = computed(() => profile.value.demographics.ageMax)
const corrAge = computed((): number => correlationAge.value ?? 42)

const focusedName = computed(() => {
  if (!focusedNodeId.value) return ''
  const attr = getAttractor(focusedNodeId.value)
  return flatLabel(attr?.label)
})

interface CorrItem {
  id: string
  otherId: string
  otherName: string
  type: 'reinforcing' | 'conflicting'
  strength: number
}

const correlationList = computed((): CorrItem[] => {
  if (!focusedNodeId.value) return []
  return getCorrEdgesForNode(focusedNodeId.value, corrAge.value)
    .map(ce => {
      const corr = CORRELATIONS.find(c => c.id === ce.corrId)
      if (!corr) return null
      const otherId = corr.from === focusedNodeId.value ? corr.to : corr.from
      const otherAttr = getAttractor(otherId)
      return {
        id: ce.corrId,
        otherId,
        otherName: otherAttr?.label ? flatLabel(otherAttr.label) : otherId,
        type: ce.type as 'reinforcing' | 'conflicting',
        strength: ce.strength,
      }
    })
    .filter((item): item is CorrItem => item !== null)
    .sort((a, b) => b.strength - a.strength)
})

function barWidth(strength: number): string {
  return Math.round(strength * 100) + '%'
}
</script>

<style scoped>
.correlation-panel {
  padding: 4px 0;
}

/* Пустое состояние */
.cp-empty {
  text-align: center;
  padding: 40px 20px;
}
.cp-icon {
  color: var(--text-muted-soft);
  margin-bottom: 12px;
  opacity: 0.5;
}
.cp-hint {
  font-size: var(--fs-sm);
  color: var(--text-muted);
  line-height: 1.5;
}

/* Контент при выбранном узле */
.cp-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* Хедер выбранного узла */
.cp-node-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 0 10px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 2px;
}
.cp-header-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.cp-reset-btn {
  background: none;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1;
  width: 20px;
  height: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: color 0.15s, border-color 0.15s;
}
.cp-reset-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
}
.cp-node-name {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--accent);
  min-width: 0;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.cp-node-count {
  font-size: var(--fs-xs);
  color: var(--text-muted);
  white-space: nowrap;
  flex-shrink: 0;
}

/* Слайдер возраста */
.cp-age-section {
  padding: 8px 0 12px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 4px;
}
.cp-age-label {
  font-size: var(--fs-xs);
  color: var(--text-muted);
  margin-bottom: 6px;
}
.cp-age-label b {
  color: var(--text);
  font-weight: 600;
}

/* Пустой список корреляций */
.cp-no-corr {
  padding: 20px 0;
  text-align: center;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

/* Список корреляций */
.cp-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cp-item {
  display: grid;
  grid-template-columns: 10px 1fr auto auto;
  align-items: center;
  gap: 6px;
  padding: 5px 0;
  border-bottom: 1px solid var(--border);
}
.cp-item:last-child {
  border-bottom: none;
}
.cp-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.cp-dot.reinforcing {
  background: #0891b2;
}
.cp-dot.conflicting {
  background: #dc2626;
}
.cp-name {
  font-size: var(--fs-sm);
  color: var(--text);
  line-height: 1.3;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cp-bar-wrap {
  width: 48px;
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
  flex-shrink: 0;
}
.cp-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}
.cp-bar.reinforcing {
  background: #0891b2;
}
.cp-bar.conflicting {
  background: #dc2626;
}
.cp-pct {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  width: 30px;
  text-align: right;
  flex-shrink: 0;
}
</style>
