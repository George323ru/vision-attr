<template>
  <div v-if="sit" class="situation-detail">
    <PanelBreadcrumb :crumbs="breadcrumbs" />

    <p class="sit-description">{{ sit.description }}</p>

    <div class="section-header">
      <div class="section-header-left">
        <span class="section-title">Прогноз</span>
      </div>
      <span v-if="predictions.length > 0" class="section-meta">
        <span class="section-meta-count">{{ predictions[0].totalFiltered }}</span>
        {{ respondentWord }}
      </span>
    </div>

    <template v-if="predictions.length > 0">
      <p class="forecast-disclaimer">{{ forecastDisclaimer }}</p>
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
          text="Полосы — прогноз стратегий поведения. Кликните на полосу, чтобы выделить стратегию."
          position="top"
        />
        <template
          v-for="(p, i) in predictions"
          :key="p.name"
        >
          <StrategyBar
            :name="p.name"
            :probability="p.probability"
            :bar-color="barColor(p.probability, predictions[0]?.probability ?? 1)"
            :selected="strategyIdx === i"
            @select="dispatch({ type: 'TOGGLE_STRATEGY', index: i })"
          />
          <div
            v-if="strategyIdx === i"
            class="strategy-detail"
          >
            <span class="strategy-detail-label">В выборке</span>
            <span class="strategy-detail-value">
              {{ p.count }} {{ peopleWord(p.count) }} из {{ p.totalFiltered }} {{ respondentPlural(p.totalFiltered) }}
            </span>
            <span class="strategy-detail-note">
              отметили эту стратегию; ответы могли пересекаться с другими стратегиями.
            </span>
          </div>
        </template>
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
          :text="noMarkupHint"
          position="top"
        />
      </template>
    </div>

    <div class="detail-actions">
      <button class="btn-back" @click="goBack()">
        &larr; {{ canGoBack ? 'Назад' : 'Все ситуации' }}
      </button>
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
const { getMarkupForSituation, markupSituations } = useMarkupStore()
const { getSituationById, totalSituations } = useSituationStore()
const { profile, strategyIdx, canGoBack, dispatch } = useStore()
const { isDismissed } = useCoachMarks()

const sit = computed(() => getSituationById(props.sitId))
const attr = computed(() => getAttractor(props.attrId))
const hasMarkupData = computed(() => getMarkupForSituation(props.sitId) !== null)
const noMarkupHint = computed(() =>
  `${markupSituations.value.length} из ${totalSituations.value} ситуаций имеют аналитические данные — остальные находятся в обработке`
)

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
    ? respondentPlural(predictions.value[0].totalFiltered)
    : ''
)

const forecastDisclaimer = 'Прогноз рассчитан по выбранным фильтрам; один респондент мог выбрать несколько стратегий, поэтому сумма может превышать 100%.'

function respondentPlural(count: number): string {
  return pluralRu(count, ['респондент', 'респондента', 'респондентов'])
}

function peopleWord(count: number): string {
  return pluralRu(count, ['человек', 'человека', 'человек'])
}

function barColor(probability: number, maxProb: number): string {
  const ratio = maxProb > 0 ? probability / maxProb : 0
  const opacity = 0.35 + 0.65 * ratio
  return `rgba(var(--accent-rgb),${opacity.toFixed(2)})`
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
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md, 8px);
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
  font-weight: 500;
  color: var(--text);
}
.section-meta {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  background: var(--accent-subtle);
  border-radius: var(--radius-pill);
  white-space: nowrap;
}
.section-meta-count {
  color: var(--text);
  font-weight: 600;
  font-feature-settings: 'tnum' 1;
}

.forecast-disclaimer {
  max-width: 760px;
  margin: -4px 0 12px;
  font-size: 11px;
  line-height: 1.45;
  color: var(--text-muted);
  letter-spacing: 0;
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
  border-radius: var(--radius-md, 8px);
  letter-spacing: 0;
}

.strategies-container {
  position: relative;
  padding-top: 4px;
}

.strategy-detail {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 6px;
  margin: -2px 10px 10px;
  padding: 8px 10px;
  font-size: 11px;
  line-height: 1.45;
  color: var(--text-muted);
  background: var(--bg-surface);
  border-left: 2px solid var(--accent);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
}
.strategy-detail-label {
  color: var(--text-dim);
}
.strategy-detail-value {
  color: var(--text);
  font-weight: 600;
  font-feature-settings: 'tnum' 1;
}
.strategy-detail-note {
  color: var(--text-muted);
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

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: 11px;
  font-weight: 500;
  border-radius: 999px;
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
</style>
