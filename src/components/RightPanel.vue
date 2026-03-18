<template>
  <div class="right-panel">
    <DemographicsPanel @age-change="$emit('age-change')" />
    <AttractorDropdowns />
    <div class="right-panel-header">
      <div class="rp-header-row">
        <h2>{{ headerTitle }}</h2>
        <button v-if="panelState !== 'empty'" class="rp-close" @click="$emit('close-panel')">&times;</button>
      </div>
      <div class="rp-desc">{{ headerDesc }}</div>
    </div>
    <div class="right-panel-content">
      <EmptyPanel v-if="panelState === 'empty'" />

      <AllSituationsPanel
        v-else-if="panelState === 'all-situations'"
        @select-situation="onSelectSituation"
      />

      <AttractorPanel
        v-else-if="panelState === 'attractor' && currentFocus"
        :node-id="currentFocus"
        @select-situation="onSelectSituation"
      />

      <SituationPanel
        v-else-if="panelState === 'situation' && currentSituation"
        :attr-id="currentSituation.attrId"
        :sit-id="currentSituation.sitId"
        :from-all-situations="currentMode === 'situations'"
        @back-to-all="$emit('show-all-situations')"
        @back-to-attractor="onBackToAttractor"
      />

      <L3Panel
        v-else-if="panelState === 'l3' && l3NodeId"
        :node-id="l3NodeId"
        @focus-parent="$emit('focus-node', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { SITUATIONS } from '@/data/situations'
import { useAppState } from '@/composables/useAppState'
import { useAttractorStore } from '@/composables/useAttractorStore'
import DemographicsPanel from './DemographicsPanel.vue'
import AttractorDropdowns from './AttractorDropdowns.vue'
import EmptyPanel from './panels/EmptyPanel.vue'
import AllSituationsPanel from './panels/AllSituationsPanel.vue'
import AttractorPanel from './panels/AttractorPanel.vue'
import SituationPanel from './panels/SituationPanel.vue'
import L3Panel from './panels/L3Panel.vue'

const emit = defineEmits<{
  'select-situation': [attrId: string, sitId: string]
  'show-all-situations': []
  'back-to-attractor': [attrId: string]
  'focus-node': [nodeId: string]
  'age-change': []
  'close-panel': []
}>()

const { panelState, currentFocus, currentSituation, currentMode, l3NodeId } = useAppState()
const { getAttractor, domains } = useAttractorStore()

const headerTitle = computed(() => {
  if (panelState.value === 'all-situations') return 'Все ситуации'
  if (panelState.value === 'situation' && currentSituation.value) {
    const sit = SITUATIONS.find(s => s.id === currentSituation.value!.sitId)
    return sit?.title ?? 'Предиктивный анализ'
  }
  if (panelState.value === 'attractor' && currentFocus.value) {
    const attr = getAttractor(currentFocus.value)
    return attr?.label ?? 'Предиктивный анализ'
  }
  if (panelState.value === 'l3' && l3NodeId.value) {
    const attr = getAttractor(l3NodeId.value)
    return attr?.label ?? 'Предиктивный анализ'
  }
  return 'Предиктивный анализ'
})

const headerDesc = computed(() => {
  if (panelState.value === 'all-situations') return 'Выберите ситуацию для анализа'
  if (panelState.value === 'situation') return 'Поведенческий прогноз'
  if (panelState.value === 'attractor' && currentFocus.value) {
    const attr = getAttractor(currentFocus.value)
    if (!attr) return ''
    const domain = domains.value[attr.domain]
    return (domain?.name ?? '') + ' — категория'
  }
  if (panelState.value === 'l3' && l3NodeId.value) {
    const attr = getAttractor(l3NodeId.value)
    if (!attr) return ''
    const domain = domains.value[attr.domain]
    return (domain?.name ?? '') + ' — аттрактор L3'
  }
  return 'Выберите категорию на графе'
})

function onSelectSituation(attrId: string, sitId: string) {
  emit('select-situation', attrId, sitId)
}

function onBackToAttractor(attrId: string) {
  emit('back-to-attractor', attrId)
}
</script>

<style scoped>
.right-panel {
  background: var(--right-bg);
  border-left: 1px solid var(--right-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: background 0.3s, border-color 0.3s;
}
.right-panel-header {
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.rp-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.right-panel-header h2 {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 4px;
}
.rp-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 20px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  transition: color 0.15s;
}
.rp-close:hover {
  color: var(--text);
}
.rp-desc {
  font-size: 12px;
  color: var(--text-muted);
}
.right-panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}
.right-panel-content::-webkit-scrollbar { width: 4px; }
.right-panel-content::-webkit-scrollbar-track { background: transparent; }
.right-panel-content::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
</style>
