<template>
  <div class="right-panel">
    <button class="collapse-toggle" @click="rightPanelCollapsed = !rightPanelCollapsed" :title="rightPanelCollapsed ? 'Показать панель' : 'Скрыть панель'">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path v-if="rightPanelCollapsed" d="M4 1l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <path v-else d="M8 1L3 6l5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <template v-if="!rightPanelCollapsed">
      <CollapsibleSection title="Демография">
        <DemographicsPanel @age-change="$emit('age-change')" />
      </CollapsibleSection>
      <CollapsibleSection title="Аттракторы человека">
        <AttractorDropdowns />
      </CollapsibleSection>
      <Transition name="header-fade" mode="out-in">
        <ActiveNodeIndicator
          v-if="activeNodeId"
          :key="activeNodeId"
          :node-id="activeNodeId"
          @close="$emit('close-panel')"
        />
        <div v-else :key="headerTitle" class="right-panel-header">
          <h2>{{ headerTitle }}</h2>
          <div class="rp-desc">{{ headerDesc }}</div>
        </div>
      </Transition>
      <div class="right-panel-content">
        <Transition name="panel-fade" mode="out-in">
          <EmptyPanel v-if="panelState === 'empty'" key="empty" />

          <AllSituationsPanel
            v-else-if="panelState === 'all-situations'"
            key="all-situations"
            @select-situation="onSelectSituation"
          />

          <AttractorPanel
            v-else-if="panelState === 'attractor' && currentFocus"
            :key="'attractor-' + currentFocus"
            :node-id="currentFocus"
            @select-situation="onSelectSituation"
          />

          <SituationPanel
            v-else-if="panelState === 'situation' && currentSituation"
            :key="'situation-' + currentSituation.sitId"
            :attr-id="currentSituation.attrId"
            :sit-id="currentSituation.sitId"
            :from-all-situations="currentMode === 'situations'"
            @back-to-all="$emit('show-all-situations')"
            @back-to-attractor="onBackToAttractor"
          />

          <L3Panel
            v-else-if="panelState === 'l3' && l3NodeId"
            :key="'l3-' + l3NodeId"
            :node-id="l3NodeId"
            @focus-parent="$emit('focus-node', $event)"
          />
        </Transition>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppState } from '@/composables/useAppState'
import ActiveNodeIndicator from './ActiveNodeIndicator.vue'
import CollapsibleSection from './CollapsibleSection.vue'
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

const { panelState, currentFocus, currentSituation, currentMode, l3NodeId, rightPanelCollapsed } = useAppState()

const activeNodeId = computed<string | null>(() => {
  if (panelState.value === 'attractor' && currentFocus.value) return currentFocus.value
  if (panelState.value === 'situation' && currentSituation.value) return currentSituation.value.attrId
  if (panelState.value === 'l3' && l3NodeId.value) return l3NodeId.value
  return null
})

const headerTitle = computed(() => {
  if (panelState.value === 'all-situations') return 'Все ситуации'
  return 'Предиктивный анализ'
})

const headerDesc = computed(() => {
  if (panelState.value === 'all-situations') return 'Выберите ситуацию для анализа'
  return 'Выберите аттрактор на графе'
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
  position: relative;
  background: var(--right-bg);
  border-left: 1px solid var(--right-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: background 0.3s, border-color 0.3s;
}
.collapse-toggle {
  position: absolute;
  left: -14px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  width: 28px;
  height: 48px;
  border: 1px solid var(--border);
  border-radius: 6px 0 0 6px;
  background: var(--card-bg);
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: color 0.2s, background 0.2s;
}
.collapse-toggle:hover {
  color: var(--accent);
  background: var(--card-hover);
}
.right-panel-header {
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.right-panel-header h2 {
  font-family: var(--font-display);
  font-size: var(--fs-md);
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 4px;
}
.rp-desc {
  font-size: var(--fs-sm);
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

/* Panel content transitions */
.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.panel-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.panel-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Header transitions */
.header-fade-enter-active,
.header-fade-leave-active {
  transition: opacity 0.15s ease;
}
.header-fade-enter-from,
.header-fade-leave-to {
  opacity: 0;
}
</style>
