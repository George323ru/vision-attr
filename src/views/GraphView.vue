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

const { viewState, dispatch } = useStore()
const { isDismissed } = useCoachMarks()

const graphMode = computed(() =>
  viewState.value.view === 'graph' ? viewState.value.graphMode : 'explore'
)

const showCorrHint = ref(false)
const showAllCorrelationLayer = ref(false)

function onCorrelationsClick() {
  dispatch({ type: 'SET_GRAPH_MODE', mode: 'correlations' })
  if (!isDismissed('ctx-correlations-mode')) {
    showCorrHint.value = true
  }
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
.graph-mode-toggle {
  display: flex;
  gap: 2px;
  background: var(--legend-bg);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 2px;
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
.gm-btn {
  font-size: 11px;
  font-weight: 500;
  padding: 5px 14px;
  border-radius: 16px;
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
  background: var(--accent);
  color: #fff;
  box-shadow: 0 1px 4px rgba(192,138,62,0.25);
}
.corr-layer-btn {
  height: 30px;
  padding: 0 12px;
  border-radius: 15px;
  border: 1px solid var(--border);
  background: var(--legend-bg);
  color: var(--text-muted);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
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
  border-color: rgba(192,138,62,0.48);
  background: rgba(192,138,62,0.14);
  color: var(--accent);
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
