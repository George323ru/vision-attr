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
    <div v-else-if="focusedAttractor && focusedAttractor.level !== 2" class="cp-content">
      <div class="cp-node-header">
        <span class="cp-node-name">{{ focusedName }}</span>
        <div class="cp-header-right">
          <button class="cp-reset-btn" @click="dispatch({ type: 'CLICK_EMPTY' })" title="Снять выделение" aria-label="Снять выделение">×</button>
        </div>
      </div>
      <div class="cp-no-corr">
        Корреляции доступны для аттракторов второго уровня. Выберите L2-узел на графе.
      </div>
    </div>
    <div v-else class="cp-content">
      <div class="cp-node-header">
        <span class="cp-node-name">{{ focusedName }}</span>
        <div class="cp-header-right">
          <span class="cp-node-count">{{ correlationList.length }} связей</span>
          <button class="cp-reset-btn" @click="dispatch({ type: 'CLICK_EMPTY' })" title="Снять выделение" aria-label="Снять выделение">×</button>
        </div>
      </div>
      <div v-if="correlationList.length === 0" class="cp-no-corr">
        Нет корреляций для этого аттрактора
      </div>
      <div v-else class="cp-groups">
        <section
          v-for="group in correlationGroups"
          :key="group.type"
          class="cp-section"
          :class="group.type"
        >
          <div class="cp-section-header">
            <div class="cp-section-title-wrap">
              <span class="cp-section-title">{{ group.title }}</span>
            </div>
            <span class="cp-section-count">{{ group.count }}</span>
          </div>

          <div class="cp-list">
            <div v-for="item in group.items" :key="item.id" class="cp-item">
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

          <button
            v-if="group.hiddenCount > 0"
            class="cp-expand-btn"
            :class="group.type"
            type="button"
            :aria-expanded="group.expanded"
            @click="toggleGroup(group.type)"
          >
            {{ group.expanded ? 'Свернуть' : `Показать ещё ${group.hiddenCount}` }}
          </button>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useStore } from '@/composables/state/useStore'
import { useAttractorStore } from '@/composables/useAttractorStore'
import { useCorrelationStore } from '@/composables/useCorrelationStore'
import { flatLabel } from '@/composables/useAttractorDisplay'

const VISIBLE_PER_GROUP = 6

const { focusedNodeId, dispatch } = useStore()
const { getAttractor } = useAttractorStore()
const { getCorrEdgesForNode } = useCorrelationStore()
const expandedGroups = ref<Record<CorrType, boolean>>({
  reinforcing: false,
  conflicting: false,
})

const focusedAttractor = computed(() => {
  if (!focusedNodeId.value) return null
  return getAttractor(focusedNodeId.value)
})

const focusedName = computed(() => {
  return flatLabel(focusedAttractor.value?.label)
})

interface CorrItem {
  id: string
  otherId: string
  otherName: string
  type: 'reinforcing' | 'conflicting'
  strength: number
}

type CorrType = CorrItem['type']

interface CorrGroup {
  type: CorrType
  title: string
  count: number
  hiddenCount: number
  expanded: boolean
  items: CorrItem[]
}

const correlationList = computed((): CorrItem[] => {
  const id = focusedNodeId.value
  if (!id) return []
  return getCorrEdgesForNode(id)
    .map((corr): CorrItem => {
      const otherId = corr.from === id ? corr.to : corr.from
      const otherAttr = getAttractor(otherId)
      return {
        id: corr.id,
        otherId,
        otherName: otherAttr?.label ? flatLabel(otherAttr.label) : otherId,
        type: corr.type,
        strength: corr.strength,
      }
    })
    .sort((a, b) => b.strength - a.strength)
})

const correlationGroups = computed((): CorrGroup[] => {
  const groupConfigs: Array<{ type: CorrType; title: string }> = [
    { type: 'reinforcing', title: 'Усиливающие связи' },
    { type: 'conflicting', title: 'Конфликтующие связи' },
  ]

  return groupConfigs
    .map(({ type, title }) => {
      const groupItems = correlationList.value.filter(item => item.type === type)
      const expanded = expandedGroups.value[type]

      return {
        type,
        title,
        count: groupItems.length,
        hiddenCount: Math.max(groupItems.length - VISIBLE_PER_GROUP, 0),
        expanded,
        items: expanded ? groupItems : groupItems.slice(0, VISIBLE_PER_GROUP),
      }
    })
    .filter(group => group.count > 0)
})

watch(focusedNodeId, () => {
  expandedGroups.value = {
    reinforcing: false,
    conflicting: false,
  }
})

function toggleGroup(type: CorrType) {
  expandedGroups.value[type] = !expandedGroups.value[type]
}

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
  border-radius: 999px;
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
  font-weight: 500;
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

/* Пустой список корреляций */
.cp-no-corr {
  padding: 20px 0;
  text-align: center;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

/* Группы корреляций */
.cp-groups {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.cp-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.cp-section + .cp-section {
  padding-top: 10px;
  border-top: 1px solid var(--border);
}
.cp-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 0 2px;
}
.cp-section-title-wrap {
  display: flex;
  align-items: center;
  min-width: 0;
}
.cp-section-title {
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cp-section-count {
  font-size: var(--fs-xs);
  color: var(--text-muted-soft);
  white-space: nowrap;
  flex-shrink: 0;
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
  padding: 6px 0;
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
  font-weight: 500;
  color: var(--text-muted);
  width: 30px;
  text-align: right;
  flex-shrink: 0;
}
.cp-expand-btn {
  align-self: flex-start;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: var(--fs-xs);
  font-weight: 500;
  padding: 5px 0 2px;
  transition: color 0.15s;
}
.cp-expand-btn:hover {
  color: var(--accent);
}
.cp-expand-btn.reinforcing:hover {
  color: #0891b2;
}
.cp-expand-btn.conflicting:hover {
  color: #dc2626;
}
</style>
