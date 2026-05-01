<template>
  <div class="graph-layout">
    <div class="graph-area">
      <D3Graph
        :show-all-correlations="effectiveShowAllCorrelationLayer"
        :layout-mode="layoutMode"
      />
      <GraphLegend :show-all-correlations="effectiveShowAllCorrelationLayer" />

      <div class="graph-quick-controls">
        <button
          v-if="hasGraphFocus"
          class="deselect-btn"
          type="button"
          aria-label="Снять выбор узла и вернуться к обзору графа"
          title="Снять выбор узла и вернуться к обзору графа"
          @click="dispatch({ type: 'CLICK_EMPTY' })"
        >
          Снять выбор
        </button>
        <button
          class="corr-layer-btn"
          type="button"
          :class="{ active: effectiveShowAllCorrelationLayer }"
          :aria-pressed="effectiveShowAllCorrelationLayer"
          aria-label="Показать или скрыть все корреляционные связи"
          :title="isProximityLayout ? 'В режиме близости фоновые линии скрыты' : 'Показать или скрыть все корреляционные связи'"
          :disabled="isProximityLayout"
          @click="showAllCorrelationLayer = !showAllCorrelationLayer"
        >
          Связи
        </button>
        <button
          class="layout-mode-btn"
          type="button"
          :class="{ active: isProximityLayout }"
          :aria-pressed="isProximityLayout"
          aria-label="Переключить раскладку графа по корреляционной близости"
          title="Переключить раскладку графа по корреляционной близости"
          @click="toggleProximityLayout"
        >
          Близость
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

    </div>
    <GraphSidebar class="graph-sidebar" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import D3Graph from '@/components/D3Graph.vue'
import GraphSidebar from '@/components/GraphSidebar.vue'
import GraphLegend from '@/components/GraphLegend.vue'
import { useStore } from '@/composables/state/useStore'
import { useAttractorStore } from '@/composables/useAttractorStore'
import type { GraphLayoutMode } from '@/composables/useGraphLayout'

const { dispatch, viewState } = useStore()
const { attractors } = useAttractorStore()

const showAllCorrelationLayer = ref(true)
const layoutMode = ref<GraphLayoutMode>('hierarchy')
const isProximityLayout = computed(() => layoutMode.value === 'proximity')
const effectiveShowAllCorrelationLayer = computed(() =>
  showAllCorrelationLayer.value && !isProximityLayout.value
)

const hasGraphFocus = computed(() =>
  viewState.value.view === 'graph' && viewState.value.focus.type !== 'none'
)

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

function toggleAllL3() {
  dispatch({
    type: 'TOGGLE_GRAPH_NODES',
    expandNodeIds: expandableNodeIds.value,
    collapseNodeIds: l2NodeIds.value,
  })
}

function toggleProximityLayout() {
  layoutMode.value = isProximityLayout.value ? 'hierarchy' : 'proximity'
}
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

.graph-quick-controls {
  position: absolute;
  top: 14px;
  right: 18px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 10;
}
.deselect-btn,
.corr-layer-btn,
.layout-mode-btn {
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
.deselect-btn {
  color: var(--accent);
}
.deselect-btn:hover,
.corr-layer-btn:hover:not(:disabled),
.layout-mode-btn:hover {
  background: var(--card-hover);
  color: var(--text);
}
.corr-layer-btn.active,
.layout-mode-btn.active {
  border-color: rgba(var(--control-active-rgb),0.22);
  background: var(--control-active);
  color: #fff;
  box-shadow: 0 1px 4px rgba(var(--control-active-rgb),0.16);
}
.corr-layer-btn:disabled {
  cursor: default;
  opacity: 0.45;
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
  .graph-quick-controls {
    top: 8px;
    right: 10px;
    gap: 6px;
  }
  .corr-layer-btn,
  .layout-mode-btn {
    width: 34px;
    padding: 0;
    overflow: hidden;
    font-size: 0;
  }
  .deselect-btn {
    width: 34px;
    padding: 0;
    overflow: hidden;
    font-size: 0;
  }
  .deselect-btn::before {
    content: '×';
    font-size: 18px;
    line-height: 1;
  }
  .corr-layer-btn::before {
    content: '↔';
    font-size: 14px;
    line-height: 1;
  }
  .layout-mode-btn::before {
    content: '◎';
    font-size: 15px;
    line-height: 1;
  }
}
</style>
