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
        :bar-color="barColors[Math.min(i, barColors.length - 1)]"
        :selected="currentStrategy === i"
        @select="toggleStrategy(i)"
      />
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

const barColors = ['var(--bar-positive)', 'var(--bar-neutral)', 'var(--bar-negative)', 'var(--text-muted)']

const attr = computed(() => getAttractor(props.attrId))
const sit = computed(() => SITUATIONS.find(s => s.id === props.sitId))

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
</style>
