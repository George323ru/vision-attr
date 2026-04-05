<template>
  <div v-if="attr">
    <PanelBreadcrumb :crumbs="breadcrumbs" />

    <!-- Инсайты — показываем всегда если есть -->
    <div v-if="attr.insights" class="insights-section">
      <div class="insights-label">Инсайт</div>
      <div class="insights-text">{{ attr.insights }}</div>
    </div>

    <!-- Если есть ситуации — показываем карточки -->
    <template v-if="situations.length > 0">
      <SituationCard
        v-for="s in situations"
        :key="s.id"
        :title="s.title"
        :description="s.description"
        :domain-color="domainColor"
        :has-data="hasMarkup(s.id)"
        @select="$emit('select-situation', nodeId, s.id)"
      />
    </template>

    <!-- Если нет ситуаций — описание + корреляции + список детей -->
    <template v-else>
      <div v-if="attr.description" class="rp-description">{{ attr.description }}</div>

      <div v-if="relatedCorrelations.length > 0" class="corr-section">
        <div class="corr-section-title">Корреляции</div>
        <div
          v-for="c in relatedCorrelations"
          :key="c.id"
          class="corr-item clickable"
          @click="currentFocus = c.otherId"
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

      <div v-if="!attr.description && relatedCorrelations.length === 0 && childList.length === 0" class="rp-empty">
        Нет данных для этой категории
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import { SITUATIONS } from '@/data/situations'
import { CORRELATIONS } from '@/data/correlations'
import { getCorrelationAtAge } from '@/composables/useCorrelations'
import { useAttractorStore } from '@/composables/useAttractorStore'
import { useAttractorDisplay } from '@/composables/useAttractorDisplay'
import { useAppState } from '@/composables/useAppState'
import { useMarkupStore } from '@/composables/useMarkupStore'
import SituationCard from '@/components/SituationCard.vue'
import PanelBreadcrumb from '@/components/PanelBreadcrumb.vue'
import type { BreadcrumbItem } from '@/components/PanelBreadcrumb.vue'

const props = defineProps<{ nodeId: string }>()

defineEmits<{ 'select-situation': [attrId: string, sitId: string] }>()

const { attractors, domains, getAttractor } = useAttractorStore()
const { l3NodeId, currentFocus, midAge } = useAppState()
const { getMarkupForSituation } = useMarkupStore()

function hasMarkup(sitId: string): boolean {
  return getMarkupForSituation(sitId) !== null
}
const { attr, domainColor } = useAttractorDisplay(toRef(props, 'nodeId'))

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
  if (!attr.value) return []
  const crumbs: BreadcrumbItem[] = []
  const domainName = domains.value[attr.value.domain]?.name ?? attr.value.domain
  crumbs.push({ label: domainName })
  if (attr.value.parent) {
    const parent = getAttractor(attr.value.parent)
    if (parent) {
      crumbs.push({ label: parent.label, action: () => { currentFocus.value = parent.id } })
    }
  }
  crumbs.push({ label: attr.value.label })
  return crumbs
})

function selectChild(child: { id: string; level: number }) {
  if (child.level === 3) {
    l3NodeId.value = child.id
  } else {
    currentFocus.value = child.id
  }
}

const situations = computed(() =>
  SITUATIONS.filter(s => s.attractorL2 === props.nodeId)
)

const childList = computed(() =>
  attractors.value
    .filter(a => a.parent === props.nodeId)
    .map(a => ({ id: a.id, label: a.label, level: a.level }))
)

const relatedCorrelations = computed(() => {
  if (attr.value?.level !== 2) return []
  const id = props.nodeId
  const result: { id: string; otherId: string; otherLabel: string; type: string; strength: number }[] = []
  for (const corr of CORRELATIONS) {
    if (corr.from !== id && corr.to !== id) continue
    const atAge = getCorrelationAtAge(corr, midAge.value)
    if (!atAge || atAge.strength <= 0) continue
    const otherId = corr.from === id ? corr.to : corr.from
    const other = getAttractor(otherId)
    result.push({
      id: corr.id,
      otherId,
      otherLabel: other?.label ?? otherId,
      type: atAge.type,
      strength: atAge.strength,
    })
  }
  return result.sort((a, b) => b.strength - a.strength).slice(0, 8)
})
</script>

<style scoped>
.rp-description {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
  padding: 10px 12px;
  background: var(--card-bg);
  border-radius: 6px;
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
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}
.l3-item {
  font-size: 11px;
  color: var(--text);
  padding: 3px 8px;
  border-left: 2px solid var(--card-border);
  margin-bottom: 3px;
  opacity: 0.8;
}
.l3-item.clickable {
  cursor: pointer;
  transition: opacity 0.15s, border-color 0.15s;
}
.l3-item.clickable:hover {
  opacity: 1;
  border-color: var(--accent);
}
.corr-section {
  margin-bottom: 12px;
}
.corr-section-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}
.corr-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 4px;
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
  font-weight: 700;
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
  border-left: 3px solid var(--accent);
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 12px;
}
.insights-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 4px;
}
.insights-text {
  font-size: 12px;
  color: var(--text);
  line-height: 1.55;
}
</style>
