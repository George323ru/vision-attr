<template>
  <div class="graph-layout">
    <div class="graph-area">
      <D3Graph :show-all-correlations="showAllCorrelationLayer" />
      <GraphLegend :show-all-correlations="showAllCorrelationLayer && graphMode === 'correlations'" />
      <div class="graph-controls">
        <div class="graph-mode-toggle">
          <button
            class="gm-btn"
            :class="{ active: graphMode === 'explore' }"
            @click="dispatch({ type: 'SET_GRAPH_MODE', mode: 'explore' })"
          >Обзор</button>
          <button
            class="gm-btn"
            :class="{ active: graphMode === 'correlations' }"
            @click="onCorrelationsClick"
          >Корреляции</button>
        </div>
      </div>

      <div class="graph-quick-controls">
        <button
          class="corr-layer-btn"
          type="button"
          :class="{ active: showAllCorrelationLayer }"
          :aria-pressed="showAllCorrelationLayer"
          aria-label="Показать или скрыть все корреляционные связи"
          title="Показать или скрыть все корреляционные связи"
          @click="showAllCorrelationLayer = !showAllCorrelationLayer"
        >
          Связи
        </button>
        <button
          class="show-l3-btn"
          type="button"
          aria-label="Показать или скрыть все L3-узлы"
          title="Показать или скрыть все L3-узлы"
          :disabled="expandableNodeIds.length === 0"
          @click="toggleAllL3"
        >
          L3
        </button>
      </div>

      <!-- Контекстная подсказка: первый вход в режим корреляций -->
      <div v-if="showCorrHint" class="ctx-hint-wrap">
        <CoachMark
          id="ctx-correlations-mode"
          text="Кликните по любому L2-аттрактору на графе, чтобы увидеть его связи с другими"
          position="bottom"
          @dismissed="showCorrHint = false"
        />
      </div>
    </div>
    <GraphSidebar class="graph-sidebar" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import D3Graph from '@/components/D3Graph.vue'
import GraphSidebar from '@/components/GraphSidebar.vue'
import GraphLegend from '@/components/GraphLegend.vue'
import CoachMark from '@/components/CoachMark.vue'
import { useStore } from '@/composables/state/useStore'
import { useCoachMarks } from '@/composables/useCoachMarks'
import { useAttractorStore } from '@/composables/useAttractorStore'

const { viewState, dispatch } = useStore()
const { isDismissed } = useCoachMarks()
const { attractors } = useAttractorStore()

const graphMode = computed(() =>
  viewState.value.view === 'graph' ? viewState.value.graphMode : 'explore'
)

const showCorrHint = ref(false)
const showAllCorrelationLayer = ref(true)

const expandableNodeIds = computed(() =>
  attractors.value
    .filter(a => a.level === 1 || a.level === 2)
    .map(a => a.id)
)

const l2NodeIds = computed(() =>
  attractors.value
    .filter(a => a.level === 2)
    .map(a => a.id)
)

function onCorrelationsClick() {
  dispatch({ type: 'SET_GRAPH_MODE', mode: 'correlations' })
  if (!isDismissed('ctx-correlations-mode')) {
    showCorrHint.value = true
  }
}

function toggleAllL3() {
  dispatch({
    type: 'TOGGLE_GRAPH_NODES',
    expandNodeIds: expandableNodeIds.value,
    collapseNodeIds: l2NodeIds.value,
  })
}

watch(graphMode, (mode) => {
  if (mode !== 'correlations') showCorrHint.value = false
})
</script>

<style scoped>
.graph-layout {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr var(--sidebar-width, 360px);
  overflow: hidden;
}

.graph-area {
  position: relative;
  overflow: hidden;
}

.graph-sidebar {
  overflow-y: auto;
}

/* Переключатели графа */
.graph-controls {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 10;
}
.graph-quick-controls {
  position: absolute;
  top: 14px;
  right: 18px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 10;
}
.graph-mode-toggle {
  display: flex;
  gap: 3px;
  background: var(--legend-bg);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 3px;
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
.gm-btn {
  font-size: 11px;
  font-weight: 500;
  padding: 5px 14px;
  border-radius: 999px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  letter-spacing: 0.4px;
  transition: background var(--duration-fast) var(--ease-out-expo),
              color var(--duration-fast);
  white-space: nowrap;
}
.gm-btn:hover {
  background: var(--card-hover);
  color: var(--text);
}
.gm-btn.active {
  background: var(--control-active);
  color: #fff;
  box-shadow: 0 1px 4px rgba(var(--control-active-rgb),0.16);
}
.corr-layer-btn {
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--legend-bg);
  color: var(--text-muted);
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0;
  white-space: nowrap;
  transition: background var(--duration-fast) var(--ease-out-expo),
              color var(--duration-fast),
              border-color var(--duration-fast);
}
.corr-layer-btn:hover {
  background: var(--card-hover);
  color: var(--text);
}
.corr-layer-btn.active {
  border-color: rgba(var(--control-active-rgb),0.22);
  background: var(--control-active);
  color: #fff;
  box-shadow: 0 1px 4px rgba(var(--control-active-rgb),0.16);
}

.show-l3-btn {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--legend-bg);
  color: var(--text);
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0;
  transition: background var(--duration-fast) var(--ease-out-expo),
              color var(--duration-fast),
              border-color var(--duration-fast);
}
.show-l3-btn:hover:not(:disabled) {
  background: var(--card-hover);
  border-color: var(--accent);
  color: var(--accent);
}
.show-l3-btn:disabled {
  cursor: default;
  opacity: 0.45;
}

.ctx-hint-wrap {
  position: absolute;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
}

@media (max-width: 1280px) {
  .graph-layout {
    --sidebar-width: 320px;
  }
}
@media (max-width: 1024px) {
  .graph-layout {
    --sidebar-width: 280px;
  }
}

@media (max-width: 768px) {
  .graph-layout {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto;
  }
  .graph-sidebar {
    border-left: none;
    border-top: 1px solid var(--border);
    max-height: 40vh;
  }
  .graph-controls {
    top: 8px;
    gap: 6px;
  }
  .graph-quick-controls {
    top: 8px;
    right: 10px;
    gap: 6px;
  }
  .corr-layer-btn {
    width: 34px;
    padding: 0;
    overflow: hidden;
    font-size: 0;
  }
  .corr-layer-btn::before {
    content: '↔';
    font-size: 14px;
    line-height: 1;
  }
}
</style>
