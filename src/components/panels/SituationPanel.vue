<template>
  <div v-if="sit && attr">
    <PanelBreadcrumb :crumbs="breadcrumbs" />

    <div class="sit-description">{{ sit.description }}</div>

    <div class="section-header">
      <div class="section-header-left">
        <span class="section-title">Прогноз</span>
        <span class="help-icon" data-tooltip="Прогноз на основе данных интервью с учётом выбранных демографических фильтров и аттракторов. Респондент мог выбрать несколько стратегий, поэтому сумма может превышать 100%.">?</span>
      </div>
      <span v-if="predictions.length > 0" class="section-meta">{{ predictions[0].totalFiltered }} респондентов</span>
    </div>

    <template v-if="predictions.length > 0">
      <div v-if="predictions[0].totalFiltered < 5" class="small-sample-warn">
        Малая выборка — результаты могут быть нестабильны
      </div>
      <div class="strategies-container">
        <StrategyBar
          v-for="(p, i) in predictions"
          :key="p.name"
          :name="p.name"
          :probability="p.probability"
          :bar-color="barColor(p.probability, predictions[0]?.probability ?? 1)"
          :selected="currentStrategy === i"
          @select="toggleStrategy(i)"
        />
      </div>
    </template>
    <div v-else class="no-data">
      <template v-if="hasMarkupData">
        Нет респондентов для выбранных фильтров.
        <span class="no-data-hint">Попробуйте более широкие настройки демографии.</span>
      </template>
      <template v-else>
        Данные по этой ситуации ещё не размечены и находятся в работе.
      </template>
    </div>

    <button class="btn-back" @click="onBack">
      {{ fromAllSituations ? '← Все ситуации' : '← Назад к ситуациям' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { SITUATIONS } from '@/data/situations'
import { useAttractorStore } from '@/composables/useAttractorStore'
import { useAppState } from '@/composables/useAppState'
import { predictBehavior } from '@/composables/usePrediction'
import { useMarkupStore } from '@/composables/useMarkupStore'
import StrategyBar from '@/components/StrategyBar.vue'
import PanelBreadcrumb from '@/components/PanelBreadcrumb.vue'
import type { BreadcrumbItem } from '@/components/PanelBreadcrumb.vue'

const props = defineProps<{
  attrId: string
  sitId: string
  fromAllSituations: boolean
}>()

const emit = defineEmits<{
  'back-to-all': []
  'back-to-attractor': [attrId: string]
}>()

const { getAttractor } = useAttractorStore()
const { ageMin, ageMax, gender, maritalStatus, childrenCount, currentStrategy, selectedAttractors } = useAppState()

const { getMarkupForSituation } = useMarkupStore()

const attr = computed(() => getAttractor(props.attrId))
const sit = computed(() => SITUATIONS.find(s => s.id === props.sitId))
const hasMarkupData = computed(() => getMarkupForSituation(props.sitId) !== null)

const predictions = computed(() =>
  predictBehavior(props.sitId, {
    ageMin: ageMin.value,
    ageMax: ageMax.value,
    gender: gender.value,
    maritalStatus: maritalStatus.value,
    childrenCount: childrenCount.value,
  }, selectedAttractors.value)
)

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
  const crumbs: BreadcrumbItem[] = []
  if (props.fromAllSituations) {
    crumbs.push({ label: 'Ситуации', action: () => emit('back-to-all') })
  }
  if (attr.value) {
    crumbs.push({ label: attr.value.label, action: () => emit('back-to-attractor', props.attrId) })
  }
  if (sit.value) {
    crumbs.push({ label: sit.value.title })
  }
  return crumbs
})

function barColor(probability: number, maxProb: number): string {
  const ratio = maxProb > 0 ? probability / maxProb : 0
  const opacity = 0.35 + 0.65 * ratio
  return `rgba(192,138,62,${opacity.toFixed(2)})`
}

function toggleStrategy(idx: number) {
  if (currentStrategy.value === idx) {
    currentStrategy.value = null
  } else {
    currentStrategy.value = idx
  }
}

function onBack() {
  if (props.fromAllSituations) {
    emit('back-to-all')
  } else {
    emit('back-to-attractor', props.attrId)
  }
}
</script>

<style scoped>
.sit-description {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
  margin-bottom: 16px;
  padding: 10px 12px;
  background: var(--card-bg);
  border-radius: 6px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.section-header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}
.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}
.section-meta {
  font-size: 10px;
  color: var(--text-muted);
}

.help-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  font-size: 9px;
  font-weight: 700;
  color: var(--text-dim);
  border: 1px solid var(--text-dim);
  border-radius: 50%;
  cursor: help;
  position: relative;
  flex-shrink: 0;
}
.help-icon:hover {
  color: var(--accent);
  border-color: var(--accent);
}
.help-icon:hover::after {
  content: attr(data-tooltip);
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  width: 230px;
  padding: 8px 10px;
  font-size: 11px;
  font-weight: 400;
  line-height: 1.4;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
  z-index: 100;
  white-space: normal;
  pointer-events: none;
}

.small-sample-warn {
  font-size: 11px;
  color: #b45309;
  background: rgba(180,83,9,0.08);
  padding: 6px 10px;
  border-radius: 4px;
  margin-bottom: 8px;
}

.no-data {
  color: var(--text-muted);
  font-size: 12px;
  text-align: center;
  padding: 32px 16px;
  line-height: 1.6;
}
.no-data-hint {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-dim);
}

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 11px;
  color: var(--accent);
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 6px;
  cursor: pointer;
  margin-top: 8px;
  transition: background 0.2s;
}
.btn-back:hover { background: var(--card-hover); }
</style>
