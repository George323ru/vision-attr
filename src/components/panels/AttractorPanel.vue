<template>
  <div v-if="attr">
    <PanelBreadcrumb :crumbs="breadcrumbs" />

    <div v-if="attr.description" class="rp-description">{{ attr.description }}</div>

    <!-- Инсайты — показываем всегда если есть -->
    <div v-if="attr.insights" class="insights-section">
      <div class="insights-label">Инсайт</div>
      <ul v-if="insightItems.length > 1" class="insights-list">
        <li v-for="(item, i) in insightItems" :key="i">{{ item }}</li>
      </ul>
      <div v-else class="insights-text">{{ attr.insights }}</div>
    </div>

    <!-- Если есть ситуации — показываем карточки -->
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

    <!-- Если нет ситуаций — корреляции + список детей -->
    <template v-else>
      <div v-if="relatedCorrelations.length > 0" class="corr-section">
        <div class="corr-section-title">Корреляции</div>
        <div
          v-for="c in relatedCorrelations"
          :key="c.id"
          class="corr-item clickable"
          @click="dispatch({ type: 'CLICK_NODE', nodeId: c.otherId, level: 2 })"
        >
          <span class="corr-dot" :class="c.type"></span>
          <span class="corr-name">{{ c.otherLabel }}</span>
          <span class="corr-strength" :class="c.type">{{ (c.strength * 100).toFixed(0) }}%</span>
        </div>
      </div>

      <div v-if="childList.length" class="l3-section">
        <div class="l3-title">{{ attr.level === 1 ? 'Аттракторы 2 уровня:' : 'Аттракторы 3 уровня:' }}</div>
        <div v-for="child in childList" :key="child.id" class="l3-item clickable" @click="selectChild(child)">{{ child.label }}</div>
      </div>

      <div v-if="!attr.description && !attr.insights && relatedCorrelations.length === 0 && childList.length === 0" class="rp-empty">
        Нет данных для этой категории
      </div>
    </template>

    <button v-if="canGoBack" class="btn-back" @click="dispatch({ type: 'GO_BACK' })">
      &larr; Назад
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useCorrelationStore } from '@/composables/useCorrelationStore'
import { useAttractorStore } from '@/composables/useAttractorStore'
import { useAttractorDisplay } from '@/composables/useAttractorDisplay'
import { useStore } from '@/composables/state/useStore'
import { useMarkupStore } from '@/composables/useMarkupStore'
import { useSituationStore } from '@/composables/useSituationStore'
import SituationCard from '@/components/SituationCard.vue'
import PanelBreadcrumb from '@/components/PanelBreadcrumb.vue'
import type { BreadcrumbItem } from '@/components/PanelBreadcrumb.vue'

const props = defineProps<{ nodeId: string }>()

const { attractors, domains, getAttractor } = useAttractorStore()
const { canGoBack, dispatch } = useStore()
const { getMarkupForSituation } = useMarkupStore()
const { getSituationsByAttractor } = useSituationStore()
const { getCorrEdgesForNode } = useCorrelationStore()

function hasMarkup(sitId: string): boolean {
  return getMarkupForSituation(sitId) !== null
}
const { attr, domainColor } = useAttractorDisplay(toRef(props, 'nodeId'))

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

const situations = computed(() => getSituationsByAttractor(props.nodeId))

const childList = computed(() =>
  attractors.value
    .filter(a => a.parent === props.nodeId)
    .map(a => ({ id: a.id, label: a.label, level: a.level }))
)

const insightItems = computed<string[]>(() => {
  const raw = attr.value?.insights
  if (!raw) return []
  // Многострочный insight: \n или маркеры списка («- », «• »)
  return raw
    .split(/\r?\n|(?:^|\s)[•\-]\s+/)
    .map(s => s.trim())
    .filter(Boolean)
})

const relatedCorrelations = computed(() => {
  if (attr.value?.level !== 2) return []
  const id = props.nodeId
  const result: { id: string; otherId: string; otherLabel: string; type: string; strength: number }[] = []
  for (const corr of getCorrEdgesForNode(id)) {
    const otherId = corr.from === id ? corr.to : corr.from
    const other = getAttractor(otherId)
    result.push({
      id: corr.id,
      otherId,
      otherLabel: other?.label ?? otherId,
      type: corr.type,
      strength: corr.strength,
    })
  }
  return result.sort((a, b) => b.strength - a.strength).slice(0, 8)
})
</script>

<style scoped>
.rp-description {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.55;
  padding: 12px 14px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md, 8px);
  margin-bottom: 12px;
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
.corr-section-title {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 6px;
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
