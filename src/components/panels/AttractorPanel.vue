<template>
  <div v-if="attr">
    <PanelBreadcrumb :crumbs="breadcrumbs" />

    <template v-if="parsedDescription">
      <div v-if="parsedDescription.body" class="rp-description">
        <div class="rp-description-title">Описание</div>
        <div class="rp-description-body">{{ parsedDescription.body }}</div>
      </div>

      <div v-if="parsedDescription.quotes.length" class="rp-quotes">
        <button
          v-if="shouldCollapseQuotes"
          class="rp-quotes-toggle"
          type="button"
          :aria-expanded="quotesExpanded"
          @click="quotesExpanded = !quotesExpanded"
        >
          {{ quotesExpanded ? 'Свернуть типовые цитаты' : 'Развернуть типовые цитаты' }}
        </button>
        <div v-else class="rp-quotes-title">{{ parsedDescription.quotesTitle }}</div>
        <ul v-if="showQuotes" class="rp-quotes-list">
          <li v-for="(quote, i) in parsedDescription.quotes" :key="i">{{ quote }}</li>
        </ul>
      </div>
    </template>

    <!-- Инсайты — показываем всегда если есть -->
    <div v-if="attr.insights" class="insights-section">
      <div class="insights-label">Инсайт</div>
      <ul v-if="insightItems.length > 1" class="insights-list">
        <li v-for="(item, i) in insightItems" :key="i">{{ item }}</li>
      </ul>
      <div v-else class="insights-text">{{ attr.insights }}</div>
    </div>

    <button
      v-if="parentL2"
      class="corr-focus-btn"
      type="button"
      @click="showNodeCorrelations(parentL2.id)"
    >
      Смотреть связи родительского L2
    </button>

    <div v-if="attr.level === 2 && relatedCorrelationGroups.length > 0" class="corr-section">
      <div class="corr-section-header">
        <div class="corr-section-title">Связи</div>
        <button
          class="corr-focus-btn compact"
          :class="{ active: isShowingNodeCorrelations }"
          type="button"
          @click="showNodeCorrelations(nodeId)"
        >
          {{ isShowingNodeCorrelations ? 'Связи показаны на графе' : 'Показать связи на графе' }}
        </button>
      </div>

      <section
        v-for="group in relatedCorrelationGroups"
        :key="group.type"
        class="corr-group"
        :class="group.type"
      >
        <div class="corr-group-header">
          <span class="corr-group-title">{{ group.title }}</span>
          <span class="corr-group-count">{{ group.count }}</span>
        </div>

        <div
          v-for="c in group.items"
          :key="c.id"
          class="corr-item clickable"
          @click="showNodeCorrelations(c.otherId)"
        >
          <span class="corr-dot" :class="c.type"></span>
          <span class="corr-name">{{ c.otherLabel }}</span>
          <span class="corr-bar-wrap">
            <span class="corr-bar" :class="c.type" :style="{ width: barWidth(c.strength) }"></span>
          </span>
          <span class="corr-strength" :class="c.type">{{ (c.strength * 100).toFixed(0) }}%</span>
        </div>

        <button
          v-if="group.hiddenCount > 0"
          class="corr-expand-btn"
          type="button"
          :aria-expanded="group.expanded"
          @click="toggleGroup(group.type)"
        >
          {{ group.expanded ? 'Свернуть' : `Показать ещё ${group.hiddenCount}` }}
        </button>
      </section>
    </div>

    <!-- Ситуации показываем только для L2: L3 в графе не должен открывать сценарный список -->
    <template v-if="situations.length > 0">
      <SituationCard
        v-for="s in situations"
        :key="s.id"
        :situation="s"
        :has-markup="hasMarkup(s.id)"
        :relevant="false"
        @open="dispatch({ type: 'OPEN_SITUATION', sitId: s.id, attrId: nodeId })"
      />
    </template>

    <!-- Если нет ситуаций — показываем список дочерних аттракторов -->
    <template v-else>
      <div v-if="childList.length" class="l3-section">
        <div class="l3-title">{{ attr.level === 1 ? 'Аттракторы 2 уровня:' : 'Аттракторы 3 уровня:' }}</div>
        <div v-for="child in childList" :key="child.id" class="l3-item clickable" @click="selectChild(child)">{{ child.label }}</div>
      </div>

      <div v-if="!attr.description && !attr.insights && relatedCorrelationGroups.length === 0 && childList.length === 0" class="rp-empty">
        Нет данных для этой категории
      </div>
    </template>

    <button v-if="canGoBack" class="btn-back" @click="dispatch({ type: 'GO_BACK' })">
      &larr; Назад
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import { useCorrelationStore } from '@/composables/useCorrelationStore'
import { useAttractorStore } from '@/composables/useAttractorStore'
import { flatLabel, useAttractorDisplay } from '@/composables/useAttractorDisplay'
import { useStore } from '@/composables/state/useStore'
import { useMarkupStore } from '@/composables/useMarkupStore'
import { useSituationStore } from '@/composables/useSituationStore'
import SituationCard from '@/components/SituationCard.vue'
import PanelBreadcrumb from '@/components/PanelBreadcrumb.vue'
import type { BreadcrumbItem } from '@/components/PanelBreadcrumb.vue'

const props = defineProps<{ nodeId: string }>()
const VISIBLE_PER_GROUP = 6

const { attractors, domains, getAttractor } = useAttractorStore()
const { canGoBack, dispatch, viewState } = useStore()
const { getMarkupForSituation } = useMarkupStore()
const { getSituationsByAttractor } = useSituationStore()
const { getCorrEdgesForNode } = useCorrelationStore()

function hasMarkup(sitId: string): boolean {
  return getMarkupForSituation(sitId) !== null
}
const { attr, domainColor } = useAttractorDisplay(toRef(props, 'nodeId'))
const quotesExpanded = ref(false)
const expandedGroups = ref<Record<CorrType, boolean>>({
  reinforcing: false,
  conflicting: false,
})

type ParsedDescription = {
  body: string
  quotesTitle: string
  quotes: string[]
}

function parseDescription(raw: string): ParsedDescription {
  const marker = /\r?\n(?:Типовые цитаты|Цитаты):\r?\n/
  const match = raw.match(marker)
  if (!match || match.index === undefined) {
    return { body: raw.trim(), quotesTitle: 'Типовые цитаты', quotes: [] }
  }

  const body = raw.slice(0, match.index).trim()
  const quoteText = raw.slice(match.index + match[0].length)
  const quotes = quoteText
    .split(/\r?\n/)
    .map(line => line.replace(/^\s*[-•]\s*/, '').trim())
    .filter(Boolean)

  return { body, quotesTitle: 'Типовые цитаты', quotes }
}

const parsedDescription = computed<ParsedDescription | null>(() => {
  const raw = attr.value?.description
  if (!raw) return null
  return parseDescription(raw)
})

const shouldCollapseQuotes = computed(() => attr.value?.level === 3)
const showQuotes = computed(() => !shouldCollapseQuotes.value || quotesExpanded.value)

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
  if (!attr.value) return []
  const domainName = domains.value[attr.value.domain]?.name ?? attr.value.domain
  const raw: BreadcrumbItem[] = [{ label: domainName }]
  if (attr.value.parent) {
    const parent = getAttractor(attr.value.parent)
    if (parent) {
      raw.push({
        label: parent.label,
        action: () => { dispatch({ type: 'CLICK_NODE', nodeId: parent.id, level: parent.level as 1 | 2 | 3 }) },
      })
    }
  }
  raw.push({ label: attr.value.label })
  // Убираем дубликаты подряд: для L1 domain.name == attr.label → «Независимость › Независимость».
  return raw.filter((c, i, arr) => i === 0 || c.label !== arr[i - 1].label)
})

function selectChild(child: { id: string; level: number }) {
  dispatch({ type: 'CLICK_NODE', nodeId: child.id, level: child.level as 1 | 2 | 3 })
}

const situations = computed(() => {
  if (attr.value?.level !== 2) return []
  return getSituationsByAttractor(props.nodeId)
})

const childList = computed(() =>
  attractors.value
    .filter(a => a.parent === props.nodeId)
    .map(a => ({ id: a.id, label: a.label, level: a.level }))
)

const parentL2 = computed(() => {
  if (attr.value?.level !== 3 || !attr.value.parent) return null
  const parent = getAttractor(attr.value.parent)
  return parent?.level === 2 ? parent : null
})

const insightItems = computed<string[]>(() => {
  const raw = attr.value?.insights
  if (!raw) return []
  // Многострочный insight: \n или маркеры списка («- », «• »)
  return raw
    .split(/\r?\n|(?:^|\s)[•\-]\s+/)
    .map(s => s.trim())
    .filter(Boolean)
})

interface CorrItem {
  id: string
  otherId: string
  otherLabel: string
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

const relatedCorrelations = computed<CorrItem[]>(() => {
  if (attr.value?.level !== 2) return []
  const id = props.nodeId
  const result: CorrItem[] = []
  for (const corr of getCorrEdgesForNode(id)) {
    const otherId = corr.from === id ? corr.to : corr.from
    const other = getAttractor(otherId)
    result.push({
      id: corr.id,
      otherId,
      otherLabel: other?.label ? flatLabel(other.label) : otherId,
      type: corr.type,
      strength: corr.strength,
    })
  }
  return result.sort((a, b) => b.strength - a.strength)
})

const relatedCorrelationGroups = computed<CorrGroup[]>(() => {
  const configs: Array<{ type: CorrType; title: string }> = [
    { type: 'reinforcing', title: 'Усиливающие связи' },
    { type: 'conflicting', title: 'Конфликтующие связи' },
  ]

  return configs
    .map(({ type, title }) => {
      const items = relatedCorrelations.value.filter(c => c.type === type)
      const expanded = expandedGroups.value[type]
      return {
        type,
        title,
        count: items.length,
        hiddenCount: Math.max(items.length - VISIBLE_PER_GROUP, 0),
        expanded,
        items: expanded ? items : items.slice(0, VISIBLE_PER_GROUP),
      }
    })
    .filter(group => group.count > 0)
})

const isShowingNodeCorrelations = computed(() => {
  const vs = viewState.value
  return vs.view === 'graph'
    && vs.focus.type === 'correlations'
    && vs.focus.nodeId === props.nodeId
})

function showNodeCorrelations(nodeId: string) {
  dispatch({ type: 'SHOW_NODE_CORRELATIONS', nodeId })
}

function toggleGroup(type: CorrType) {
  expandedGroups.value[type] = !expandedGroups.value[type]
}

function barWidth(strength: number): string {
  return Math.round(strength * 100) + '%'
}

watch(() => props.nodeId, () => {
  quotesExpanded.value = false
  expandedGroups.value = {
    reinforcing: false,
    conflicting: false,
  }
})
</script>

<style scoped>
.rp-description {
  padding: 12px 14px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md, 8px);
  margin-bottom: 12px;
}
.rp-description-title {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 6px;
}
.rp-description-body {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.55;
}
.rp-quotes {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-left: 3px solid var(--accent);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  margin-bottom: 12px;
}
.rp-quotes-title {
  font-size: 10px;
  font-weight: 500;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 4px;
}
.rp-quotes-toggle {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--accent);
  cursor: pointer;
  font-size: 10px;
  font-weight: 600;
  text-align: left;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0;
}
.rp-quotes-toggle + .rp-quotes-list {
  margin-top: 6px;
}
.rp-quotes-list {
  font-size: 12px;
  color: var(--text);
  line-height: 1.55;
  margin: 0;
  padding-left: 18px;
}
.rp-quotes-list li + li {
  margin-top: 4px;
}
.rp-empty {
  color: var(--text-muted);
  font-size: 13px;
  text-align: center;
  padding: 40px 20px;
}
.l3-section { margin-top: 8px; }
.l3-title {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 6px;
}
.l3-item {
  font-size: 11px;
  color: var(--text);
  padding: 5px 8px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  margin-bottom: 2px;
  opacity: 0.8;
}
.l3-item.clickable {
  cursor: pointer;
  transition: opacity 0.15s, border-color 0.15s;
}
.l3-item.clickable:hover {
  opacity: 1;
  border-color: var(--accent);
  background: var(--card-hover);
}
.corr-section {
  margin-bottom: 12px;
}
.corr-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.corr-section-title {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.corr-focus-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--card-bg);
  color: var(--accent);
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  padding: 8px 12px;
  margin-bottom: 12px;
  transition: background var(--duration-fast), border-color var(--duration-fast), color var(--duration-fast);
}
.corr-focus-btn:hover {
  background: var(--card-hover);
  border-color: var(--accent);
}
.corr-focus-btn.compact {
  flex-shrink: 0;
  margin-bottom: 0;
  padding: 6px 10px;
  font-size: 10px;
}
.corr-focus-btn.active {
  background: var(--control-active);
  border-color: rgba(var(--control-active-rgb),0.22);
  color: #fff;
}
.corr-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.corr-group + .corr-group {
  border-top: 1px solid var(--border);
  margin-top: 10px;
  padding-top: 10px;
}
.corr-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 0;
}
.corr-group-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text);
}
.corr-group-count {
  font-size: 10px;
  color: var(--text-muted);
}
.corr-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  transition: background 0.15s;
}
.corr-item.clickable {
  cursor: pointer;
}
.corr-item.clickable:hover {
  background: var(--card-hover);
}
.corr-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.corr-dot.reinforcing {
  background: #0891b2;
}
.corr-dot.conflicting {
  background: #dc2626;
}
.corr-name {
  flex: 1;
  font-size: 12px;
  color: var(--text);
  min-width: 0;
}
.corr-bar-wrap {
  width: 44px;
  height: 4px;
  border-radius: 999px;
  background: var(--border);
  overflow: hidden;
  flex-shrink: 0;
}
.corr-bar {
  display: block;
  height: 100%;
  border-radius: inherit;
}
.corr-bar.reinforcing {
  background: #0891b2;
}
.corr-bar.conflicting {
  background: #dc2626;
}
.corr-strength {
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}
.corr-strength.reinforcing {
  color: #0891b2;
}
.corr-strength.conflicting {
  color: #dc2626;
}
.corr-expand-btn {
  align-self: flex-start;
  border: 0;
  background: transparent;
  color: var(--accent);
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
}
.insights-section {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-left: 3px solid var(--accent);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  margin-bottom: 12px;
}
.insights-label {
  font-size: 10px;
  font-weight: 500;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 4px;
}
.insights-text {
  font-size: 12px;
  color: var(--text);
  line-height: 1.55;
}
.insights-list {
  font-size: 12px;
  color: var(--text);
  line-height: 1.55;
  margin: 0;
  padding-left: 18px;
}
.insights-list li + li {
  margin-top: 4px;
}
.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: 11px;
  font-weight: 500;
  color: var(--accent);
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 999px;
  cursor: pointer;
  margin-top: 12px;
  letter-spacing: 0.02em;
  transition: background var(--duration-fast) var(--ease-out-quad),
              box-shadow var(--duration-fast);
}
.btn-back:hover {
  background: var(--card-hover);
  box-shadow: var(--shadow-sm);
}
</style>
