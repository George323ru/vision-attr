<template>
  <div v-if="sit" class="situation-detail">
    <PanelBreadcrumb :crumbs="breadcrumbs" />

    <p class="sit-description">{{ sit.description }}</p>

    <div class="section-header">
      <div class="section-header-left">
        <span class="section-title">Прогноз</span>
        <button
          type="button"
          class="help-icon"
          aria-label="Как рассчитан прогноз"
          :data-tooltip="helpTooltip"
        >?</button>
      </div>
      <span v-if="predictions.length > 0" class="section-meta">{{ predictions[0].totalFiltered }} {{ respondentWord }}</span>
    </div>

    <template v-if="predictions.length > 0">
      <div v-if="predictions[0].totalFiltered < 5" class="small-sample-warn-wrap">
        <div class="small-sample-warn">
          Малая выборка: результаты могут быть нестабильны
        </div>
        <CoachMark
          id="ctx-small-sample"
          text="Выборка меньше 5 человек — расширьте возрастной диапазон или снимите фильтры демографии"
          position="bottom"
        />
      </div>
      <div class="strategies-container">
        <CoachMark
          v-if="!isDismissed('ctx-first-situation-opened')"
          id="ctx-first-situation-opened"
          text="Полосы — прогноз стратегий поведения. Кликните на полосу, чтобы выделить стратегию. Нажмите «?» рядом с Прогноз для деталей методологии."
          position="top"
        />
        <StrategyBar
          v-for="(p, i) in predictions"
          :key="p.name"
          :name="p.name"
          :probability="p.probability"
          :bar-color="barColor(p.probability, predictions[0]?.probability ?? 1)"
          :selected="strategyIdx === i"
          @select="dispatch({ type: 'TOGGLE_STRATEGY', index: i })"
        />
      </div>
    </template>
    <div v-else class="no-data">
      <template v-if="hasMarkupData">
        Нет респондентов для выбранных фильтров.
        <span class="no-data-hint">Попробуйте расширить настройки демографии.</span>
      </template>
      <template v-else>
        <div>Данные по этой ситуации ещё не размечены и находятся в работе.</div>
        <CoachMark
          id="ctx-no-markup"
          text="8 из 33 ситуаций имеют аналитические данные — остальные находятся в обработке"
          position="top"
        />
      </template>
    </div>

    <div class="detail-actions">
      <button class="btn-back" @click="goBack()">
        &larr; {{ canGoBack ? 'Назад' : 'Все ситуации' }}
      </button>
      <div v-if="parentL1" class="btn-graph-wrap">
        <CoachMark
          v-if="!isDismissed('ctx-show-on-graph')"
          id="ctx-show-on-graph"
          text="Откроет граф и выделит связанный аттрактор"
          position="top"
        />
        <button class="btn-graph" @click="navigateToGraph()">
          Показать на графе &rarr;
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAttractorStore } from '@/composables/useAttractorStore'
import { useMarkupStore } from '@/composables/useMarkupStore'
import { useSituationStore } from '@/composables/useSituationStore'
import { predictBehavior } from '@/composables/usePrediction'
import { useStore } from '@/composables/state/useStore'
import { useCoachMarks } from '@/composables/useCoachMarks'
import StrategyBar from '@/components/StrategyBar.vue'
import PanelBreadcrumb from '@/components/PanelBreadcrumb.vue'
import CoachMark from '@/components/CoachMark.vue'
import type { BreadcrumbItem } from '@/components/PanelBreadcrumb.vue'
import { pluralRu } from '@/utils/plural'
import { flatLabel } from '@/composables/useAttractorDisplay'

const props = defineProps<{
  sitId: string
  attrId: string
}>()

const { getAttractor } = useAttractorStore()
const { getMarkupForSituation } = useMarkupStore()
const { getSituationById } = useSituationStore()
const { profile, strategyIdx, canGoBack, dispatch } = useStore()
const { isDismissed } = useCoachMarks()

const sit = computed(() => getSituationById(props.sitId))
const attr = computed(() => getAttractor(props.attrId))
const hasMarkupData = computed(() => getMarkupForSituation(props.sitId) !== null)

const parentL1 = computed(() => {
  const a = attr.value
  if (!a) return null
  if (a.level === 1) return a.id
  if (a.level === 2) return a.parent ?? null
  // L3 → parent L2 → parent L1
  const l2 = a.parent ? getAttractor(a.parent) : null
  return l2?.parent ?? null
})

function navigateToGraph() {
  dispatch({
    type: 'NAVIGATE_TO_GRAPH_NODE',
    nodeId: props.attrId,
    level: (attr.value?.level ?? 2) as 1 | 2 | 3,
    parentL1: parentL1.value,
  })
}

function goBack() {
  if (canGoBack.value) {
    dispatch({ type: 'GO_BACK' })
  } else {
    dispatch({ type: 'CLOSE_SITUATION' })
  }
}

const predictions = computed(() => {
  const d = profile.value.demographics
  return predictBehavior(props.sitId, {
    ageMin: d.ageMin,
    ageMax: d.ageMax,
    gender: d.gender,
    maritalStatus: d.maritalStatus,
    childrenCount: d.childrenCount,
  }, [...profile.value.selectedAttractors])
})

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
  const crumbs: BreadcrumbItem[] = [
    { label: 'Ситуации', action: () => dispatch({ type: 'CLOSE_SITUATION' }) },
  ]
  if (attr.value) {
    crumbs.push({ label: flatLabel(attr.value.label) })
  }
  if (sit.value) {
    crumbs.push({ label: sit.value.title })
  }
  return crumbs
})

const respondentWord = computed(() =>
  predictions.value.length > 0
    ? pluralRu(predictions.value[0].totalFiltered, ['респондент', 'респондента', 'респондентов'])
    : ''
)

const helpTooltip = 'Прогноз рассчитан по данным интервью с учётом выбранных демографических фильтров и аттракторов. Один респондент мог выбрать несколько стратегий, поэтому сумма может превышать 100%.'

function barColor(probability: number, maxProb: number): string {
  const ratio = maxProb > 0 ? probability / maxProb : 0
  const opacity = 0.35 + 0.65 * ratio
  return `rgba(192,138,62,${opacity.toFixed(2)})`
}
</script>

<style scoped>
.situation-detail {
  padding: 0 4px;
}
.sit-description {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.55;
  margin-bottom: 16px;
  padding: 12px 14px;
  background: var(--card-bg);
  border-radius: var(--radius-md, 10px);
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
  background: transparent;
  border: 1px solid var(--text-dim);
  border-radius: 50%;
  cursor: help;
  position: relative;
  flex-shrink: 0;
  padding: 0;
  font-family: inherit;
  line-height: 1;
  transition: color var(--duration-fast) var(--ease-out-quad),
              border-color var(--duration-fast),
              box-shadow var(--duration-fast);
}
.help-icon:hover,
.help-icon:focus-visible {
  color: var(--accent);
  border-color: var(--accent);
  outline: none;
  box-shadow: 0 0 0 2px var(--accent-subtle, rgba(192,138,62,0.18));
}
.help-icon:hover::after,
.help-icon:focus-visible::after {
  content: attr(data-tooltip);
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: 230px;
  padding: 10px 12px;
  font-size: 11px;
  font-weight: 400;
  line-height: 1.5;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-md, 10px);
  box-shadow: var(--shadow-lg);
  z-index: 100;
  white-space: normal;
  pointer-events: none;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.small-sample-warn-wrap {
  position: relative;
  margin-bottom: 8px;
}

.small-sample-warn {
  font-size: 11px;
  color: #b45309;
  background: rgba(180,83,9,0.06);
  padding: 8px 12px;
  border-radius: var(--radius-sm, 6px);
  letter-spacing: 0.01em;
}

.strategies-container {
  position: relative;
  padding-top: 4px;
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

.detail-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  align-items: center;
}

.btn-graph-wrap {
  position: relative;
  margin-left: auto;
}
.btn-back,
.btn-graph {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: 11px;
  font-weight: 500;
  border-radius: var(--radius-sm, 6px);
  cursor: pointer;
  letter-spacing: 0.02em;
  transition: background var(--duration-fast) var(--ease-out-quad),
              border-color var(--duration-fast),
              box-shadow var(--duration-fast),
              transform var(--duration-fast);
}
.btn-back {
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-muted);
}
.btn-back:hover {
  color: var(--text);
  background: var(--card-hover);
}
.btn-graph {
  background: var(--accent);
  border: 1px solid var(--accent);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(192,138,62,0.25);
}
.btn-graph:hover {
  filter: brightness(1.05);
  box-shadow: 0 2px 8px rgba(192,138,62,0.35);
  transform: translateY(-1px);
}
.btn-graph:active {
  transform: translateY(0);
}
</style>
