<template>
  <div v-if="sit && attr">
    <div class="breadcrumb">
      <template v-if="fromAllSituations">
        <a @click="$emit('back-to-all')">Ситуации</a>
        <span>›</span>
        <span>{{ attr.label }}</span>
      </template>
      <template v-else>
        <a @click="$emit('back-to-attractor', attrId)">{{ attr.label }}</a>
      </template>
      <span>›</span>
      <span>{{ sit.title }}</span>
    </div>

    <div class="sit-description">{{ sit.description }}</div>

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

    <div v-if="markup" class="markup-section">
      <div class="markup-header">
        <span class="markup-title">Данные разметки</span>
        <span class="markup-meta">{{ markup.totalRespondents }} респондентов</span>
      </div>
      <div class="markup-strategies">
        <div v-for="s in markup.strategies" :key="s.name" class="markup-bar-item">
          <div class="markup-bar-label">
            <span>{{ s.name }}</span>
            <span class="markup-pct">{{ Math.round(s.frequency * 100) }}%</span>
          </div>
          <div class="markup-bar-track">
            <div
              class="markup-bar-fill"
              :style="{ width: (s.frequency * 100) + '%' }"
            ></div>
          </div>
        </div>
      </div>
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
const { midAge, currentStrategy } = useAppState()

const { getMarkupForSituation } = useMarkupStore()

function barColor(probability: number, maxProb: number): string {
  const ratio = maxProb > 0 ? probability / maxProb : 0
  const opacity = 0.35 + 0.65 * ratio
  return `rgba(192,138,62,${opacity.toFixed(2)})`
}

const attr = computed(() => getAttractor(props.attrId))
const sit = computed(() => SITUATIONS.find(s => s.id === props.sitId))
const markup = computed(() => getMarkupForSituation(props.sitId))

const predictions = computed(() =>
  predictBehavior(props.sitId, midAge.value)
)

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
.breadcrumb {
  font-size: 11px;
  color: var(--breadcrumb);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.breadcrumb a {
  color: var(--accent);
  cursor: pointer;
  text-decoration: none;
}
.breadcrumb a:hover { text-decoration: underline; }

.sit-description {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
  margin-bottom: 16px;
  padding: 10px 12px;
  background: var(--card-bg);
  border-radius: 6px;
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

.markup-section {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--card-border);
}
.markup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.markup-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}
.markup-meta {
  font-size: 10px;
  color: var(--text-muted);
}
.markup-bar-item {
  margin-bottom: 8px;
}
.markup-bar-label {
  font-size: 11px;
  color: var(--text);
  margin-bottom: 3px;
  display: flex;
  justify-content: space-between;
}
.markup-pct {
  font-weight: 600;
  color: var(--accent);
  font-size: 11px;
}
.markup-bar-track {
  height: 18px;
  background: var(--bar-bg);
  border-radius: 4px;
  overflow: hidden;
}
.markup-bar-fill {
  height: 100%;
  border-radius: 4px;
  background: var(--accent);
  opacity: 0.7;
  transition: width 0.4s ease;
  min-width: 2px;
}
</style>
